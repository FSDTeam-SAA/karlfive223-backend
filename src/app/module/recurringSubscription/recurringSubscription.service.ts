import Stripe from 'stripe';
import AppError from '../../error/appError';
import { Payment } from '../payment/payment.model';
import { PLAN_DETAILS, SubscriptionPlanType } from '../subscription/subscription.constant';
import User from '../user/user.model';
import { IConfirmRecurringSubscriptionPayload, ICreateRecurringSubscriptionPayload } from './recurringSubscription.interface';
import { RecurringSubscription } from './recurringSubscription.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2025-08-27.basil' });
const PRICE_IDS: Record<'basic' | 'gold' | 'club', string | undefined> = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  gold: process.env.STRIPE_PRICE_ID_GOLD,
  club: process.env.STRIPE_PRICE_ID_CLUB,
};
const toDate = (value?: number | null) => value ? new Date(value * 1000) : undefined;

const applyPlanToUser = async (userId: string, plan: string) => {
  await User.findByIdAndUpdate(userId, {
    leaguesCreatedCount: 0,
    leaguesJoinedCount: 0,
    isOrganizer: plan === 'club',
  });
};

const getOrCreateCustomer = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId },
  });
  await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
  return customer.id;
};

/** Collect a card without charging it. The subscription is created after setup succeeds. */
export const createRecurringPaymentIntent = async (payload: ICreateRecurringSubscriptionPayload) => {
  const { userId, plan, amount } = payload;
  if (!['basic', 'gold', 'club'].includes(plan)) throw new AppError(400, 'Invalid plan');
  const details = PLAN_DETAILS[plan as SubscriptionPlanType];
  if (Math.round(amount * 100) !== Math.round(details.price * 100)) {
    throw new AppError(400, `Amount does not match the ${plan} plan price`);
  }
  if (!PRICE_IDS[plan]) throw new AppError(500, `Stripe price is not configured for ${plan}`);

  const current = await RecurringSubscription.findOne({
    userId,
    status: { $in: ['trialing', 'active', 'past_due'] },
  });
  if (current) throw new AppError(409, 'An active subscription already exists');

  // A leftover 'pending' record means a previous card-setup attempt was
  // abandoned (user backed out of the payment sheet, app closed, etc.)
  // before confirmRecurringPayment ran. Nothing was ever charged or
  // subscribed for it, so clear it out instead of permanently blocking
  // this user from ever starting a subscription again.
  await RecurringSubscription.deleteMany({ userId, status: 'pending' });

  const customerId = await getOrCreateCustomer(userId);
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    payment_method_types: ['card'],
    metadata: { userId, plan, type: 'recurring_subscription_setup' },
  });

  await RecurringSubscription.create({
    userId, plan, status: 'pending', stripeCustomerId: customerId,
    stripePaymentMethodId: '', amount, currency: 'usd',
    billingPeriodStart: new Date(), billingPeriodEnd: new Date(),
    initialSetupIntentId: setupIntent.id,
  });
  return { clientSecret: setupIntent.client_secret, setupIntentId: setupIntent.id, plan, amount, firstMonthFree: true };
};

/** Start Stripe's 30-day trial only after the SetupIntent saved the card. */
export const confirmRecurringPayment = async (payload: IConfirmRecurringSubscriptionPayload) => {
  const { userId, setupIntentId, paymentMethodId } = payload;

  const subscription = await RecurringSubscription.findOne({ initialSetupIntentId: setupIntentId });
  if (!subscription) throw new AppError(404, 'Pending subscription record not found');
  if (subscription.userId.toString() !== userId) throw new AppError(403, 'Subscription does not belong to this user');

  // Idempotent retry: the client may re-send this call after a dropped
  // network response even though the subscription was already activated
  // (e.g. PaymentSheet succeeded but the app lost connectivity before
  // reading the response). Return the current state instead of a 409 so a
  // retry after a real success doesn't read as a failure to the user.
  if (subscription.status !== 'pending') {
    return {
      subscriptionId: subscription.stripeSubscriptionId, plan: subscription.plan, status: subscription.status,
      trialEnd: subscription.trialEnd, nextBillingDate: subscription.billingPeriodEnd, amount: subscription.amount,
    };
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  if (setupIntent.status !== 'succeeded') throw new AppError(400, `Card setup status is ${setupIntent.status}`);
  const paymentMethod = paymentMethodId || String(setupIntent.payment_method || '');
  if (!paymentMethod) throw new AppError(400, 'A saved payment method is required');

  try {
    await stripe.paymentMethods.attach(paymentMethod, { customer: subscription.stripeCustomerId });
  } catch (error: any) {
    if (error.code !== 'resource_already_exists') throw error;
  }
  await stripe.customers.update(subscription.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethod },
  });

  const stripeSubscription = await stripe.subscriptions.create({
    customer: subscription.stripeCustomerId,
    items: [{ price: PRICE_IDS[subscription.plan]!, quantity: 1 }],
    default_payment_method: paymentMethod,
    trial_period_days: 30,
    payment_settings: { save_default_payment_method: 'on_subscription' },
    metadata: { userId: subscription.userId.toString(), plan: subscription.plan, type: 'recurring_subscription' },
  });
  const stripeSub = stripeSubscription as any;
  const trialEnd = toDate(stripeSub.trial_end) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const periodEnd = toDate(stripeSub.current_period_end) || trialEnd;
  subscription.status = stripeSub.status === 'trialing' ? 'trialing' : 'active';
  subscription.stripePaymentMethodId = paymentMethod;
  subscription.stripeSubscriptionId = stripeSubscription.id;
  subscription.billingPeriodStart = toDate(stripeSub.current_period_start) || new Date();
  subscription.billingPeriodEnd = periodEnd;
  subscription.trialStart = new Date();
  subscription.trialEnd = trialEnd;
  await subscription.save();

  await Payment.findOneAndUpdate(
    { transactionId: setupIntentId },
    { userId: subscription.userId, amount: 0, stripeCustomerId: subscription.stripeCustomerId,
      transactionId: setupIntentId, type: 'subscription', subscriptionPlan: subscription.plan,
      subscriptionId: stripeSubscription.id, subscriptionStatus: subscription.status,
      status: 'success', expiryDate: trialEnd },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await applyPlanToUser(subscription.userId.toString(), subscription.plan);
  return { subscriptionId: stripeSubscription.id, plan: subscription.plan, status: subscription.status,
    trialEnd, nextBillingDate: periodEnd, amount: subscription.amount };
};

/** End automatic billing at the current trial/paid period boundary. */
export const cancelRecurringSubscription = async (userId: string, reason?: string) => {
  const subscription = await RecurringSubscription.findOne({
    userId, status: { $in: ['trialing', 'active', 'past_due'] },
  }).sort({ createdAt: -1 });
  if (!subscription?.stripeSubscriptionId) throw new AppError(404, 'Active subscription not found');
  const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
  subscription.cancelAtPeriodEnd = true;
  subscription.canceledAt = new Date();
  subscription.cancelReason = reason || 'User requested cancellation';
  subscription.billingPeriodEnd = toDate((updated as any).current_period_end) || subscription.billingPeriodEnd;
  await subscription.save();
  await Payment.updateMany({ subscriptionId: subscription.stripeSubscriptionId }, {
    subscriptionStatus: subscription.status, expiryDate: subscription.billingPeriodEnd,
  });
  return { subscriptionId: subscription.stripeSubscriptionId, status: subscription.status,
    cancelAtPeriodEnd: true, accessEndsAt: subscription.billingPeriodEnd };
};

export const getRecurringSubscriptionStatus = async (userId: string) => {
  const subscription = await RecurringSubscription.findOne({
    userId, status: { $in: ['pending', 'trialing', 'active', 'past_due'] },
  }).sort({ createdAt: -1 });
  if (!subscription) return null;
  return { userId: subscription.userId, plan: subscription.plan, status: subscription.status,
    isActive: ['trialing', 'active'].includes(subscription.status),
    isTrialing: subscription.status === 'trialing', trialEnd: subscription.trialEnd,
    nextBillingDate: subscription.billingPeriodEnd, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    amount: subscription.amount, failureCount: subscription.failureCount };
};

export const getRecurringSubscriptionHistory = async (userId: string) => {
  const subscriptions = await RecurringSubscription.find({ userId }).sort({ createdAt: -1 });
  return subscriptions.map((sub) => ({ subscriptionId: sub.stripeSubscriptionId, plan: sub.plan,
    status: sub.status, amount: sub.amount, startDate: sub.createdAt, trialEnd: sub.trialEnd,
    endDate: sub.billingPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    canceledAt: sub.canceledAt, cancelReason: sub.cancelReason }));
};

export const handleSubscriptionUpdatedWebhook = async (event: any) => {
  const stripeSub = event.data.object as any;
  const subscription = await RecurringSubscription.findOne({ stripeSubscriptionId: stripeSub.id });
  if (!subscription) return;
  if (['trialing', 'active', 'past_due'].includes(stripeSub.status)) subscription.status = stripeSub.status;
  subscription.cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end);
  subscription.billingPeriodStart = toDate(stripeSub.current_period_start) || subscription.billingPeriodStart;
  subscription.billingPeriodEnd = toDate(stripeSub.current_period_end) || subscription.billingPeriodEnd;
  subscription.trialEnd = toDate(stripeSub.trial_end) || subscription.trialEnd;
  await subscription.save();
  await Payment.updateMany({ subscriptionId: stripeSub.id }, { subscriptionStatus: subscription.status, expiryDate: subscription.billingPeriodEnd });
  await applyPlanToUser(subscription.userId.toString(), subscription.plan);
};

export const handleInvoicePaidWebhook = async (event: any) => {
  const invoice = event.data.object as any;
  if (!invoice.subscription) return;
  const subscription = await RecurringSubscription.findOne({ stripeSubscriptionId: invoice.subscription });
  if (!subscription) return;
  // Stripe can emit a zero-value invoice when a trial is created. Keep that
  // state as trialing until the actual trial end instead of marking it paid.
  subscription.status = subscription.trialEnd && subscription.trialEnd > new Date()
    ? 'trialing' : 'active';
  subscription.failureCount = 0;
  subscription.billingPeriodStart = toDate(invoice.period_start) || subscription.billingPeriodStart;
  subscription.billingPeriodEnd = toDate(invoice.period_end) || subscription.billingPeriodEnd;
  await subscription.save();
  // Stripe guarantees at-least-once webhook delivery, so the same
  // invoice.paid event can arrive more than once (retries, redelivery from
  // the dashboard, etc.). Upsert on the invoice's own transaction id instead
  // of Payment.create() so a redelivered event updates the existing history
  // row rather than creating a duplicate billing record.
  const invoiceTransactionId = invoice.payment_intent || invoice.id;
  await Payment.findOneAndUpdate(
    { transactionId: invoiceTransactionId },
    { userId: subscription.userId, amount: invoice.amount_paid / 100,
      stripeCustomerId: subscription.stripeCustomerId, transactionId: invoiceTransactionId,
      type: 'subscription', subscriptionPlan: subscription.plan, subscriptionId: subscription.stripeSubscriptionId,
      subscriptionStatus: subscription.status, status: 'success', expiryDate: subscription.billingPeriodEnd },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await applyPlanToUser(subscription.userId.toString(), subscription.plan);
};

export const handleInvoicePaymentFailedWebhook = async (event: any) => {
  const invoice = event.data.object as any;
  const subscription = await RecurringSubscription.findOne({ stripeSubscriptionId: invoice.subscription });
  if (!subscription) return;
  subscription.failureCount += 1; subscription.lastFailureDate = new Date();
  subscription.lastFailureReason = invoice.last_finalization_error?.message || 'Payment failed';
  subscription.status = 'past_due'; await subscription.save();
  await Payment.updateMany({ subscriptionId: subscription.stripeSubscriptionId }, { subscriptionStatus: 'past_due' });
};

export const handleSubscriptionDeletedWebhook = async (event: any) => {
  const stripeSub = event.data.object as any;
  const subscription = await RecurringSubscription.findOne({ stripeSubscriptionId: stripeSub.id });
  if (!subscription) return;
  subscription.status = 'canceled'; subscription.canceledAt = subscription.canceledAt || new Date();
  subscription.cancelAtPeriodEnd = true;
  subscription.billingPeriodEnd = toDate(stripeSub.ended_at) || subscription.billingPeriodEnd;
  await subscription.save();
  await Payment.updateMany({ subscriptionId: stripeSub.id }, { subscriptionStatus: 'canceled', expiryDate: subscription.billingPeriodEnd });
  if (subscription.plan === 'club') await User.findByIdAndUpdate(subscription.userId, { isOrganizer: false });
};

import Stripe from 'stripe';
import AppError from '../../error/appError';
import { Payment } from '../payment/payment.model';
import { PLAN_DETAILS, SubscriptionPlanType } from '../subscription/subscription.constant';
import User from '../user/user.model';
import {
    IConfirmRecurringSubscriptionPayload,
    ICreateRecurringSubscriptionPayload,
} from './recurringSubscription.interface';
import { RecurringSubscription } from './recurringSubscription.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

// ─── Create Payment Intent for Recurring Subscription ──────────────────────
export const createRecurringPaymentIntent = async (
  payload: ICreateRecurringSubscriptionPayload
) => {
  const { userId, plan, amount } = payload;

  // Validate plan
  if (!['basic', 'gold', 'club'].includes(plan)) {
    throw new AppError(400, 'Invalid plan');
  }

  // Validate amount matches plan
  const planDetails = PLAN_DETAILS[plan as SubscriptionPlanType];
  if (Math.round(amount * 100) !== Math.round(planDetails.price * 100)) {
    throw new AppError(
      400,
      `Amount ${amount} does not match plan price ${planDetails.price}`
    );
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    }

    // Create payment intent with setup_future_usage to save card
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customerId,
      setup_future_usage: 'off_session', // Save card for future recurring charges
      metadata: {
        userId,
        plan,
        type: 'recurring_subscription',
      },
    });

    // Create pending recurring subscription record
    const billingPeriodStart = new Date();
    const billingPeriodEnd = new Date();
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

    const subscription = new RecurringSubscription({
      userId,
      plan,
      status: 'pending',
      stripeCustomerId: customerId,
      stripePaymentMethodId: '', // Will be updated after payment
      amount,
      currency: 'usd',
      billingPeriodStart,
      billingPeriodEnd,
      initialPaymentIntentId: paymentIntent.id,
    });
    await subscription.save();

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      plan,
      amount,
    };
  } catch (error: any) {
    console.error('Error creating recurring payment intent:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, error.message ?? 'Failed to create payment intent');
  }
};

// ─── Confirm Payment and Create Stripe Subscription ────────────────────────
export const confirmRecurringPayment = async (
  payload: IConfirmRecurringSubscriptionPayload
) => {
  const { paymentIntentId, paymentMethodId } = payload;

  try {
    // Verify payment intent succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError(400, `Payment status is ${paymentIntent.status}`);
    }

    // Find subscription record
    const subscription = await Payment.findOne({
      transactionId: paymentIntentId,
    });

    if (!subscription) {
      throw new AppError(404, 'Subscription record not found');
    }

    // if (subscription.status !== 'pending') {
    //   throw new AppError(400, `Subscription status is already ${subscription.status}`);
    // }

    // Update subscription with payment method
    // subscription.stripePaymentMethodId = paymentMethodId;

    // Create Stripe subscription for recurring charges
    // const plan = subscription.plan as SubscriptionPlanType;

    // Get price ID from environment
    const plan= "basic"
    const priceIdMap: Record<string, string | undefined> = {
      basic: process.env.STRIPE_PRICE_ID_BASIC,
      gold: process.env.STRIPE_PRICE_ID_GOLD,
      club: process.env.STRIPE_PRICE_ID_CLUB,
    };

    const priceId = priceIdMap[plan];
    if (!priceId) {
      throw new AppError(400, `Price ID not configured for plan: ${plan}`);
    }

    const stripeSubscription = await stripe.subscriptions.create({
      customer: subscription.stripeCustomerId,
      items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      default_payment_method: paymentMethodId,
      off_session: true,
      automatic_tax: { enabled: false },
    //   metadata: {
    //     // userId: subscription.userId.toString(),
    //     plan,
    //   },
    });

    // Update subscription to active
    // subscription.status = 'active';
    // subscription.stripeSubscriptionId = stripeSubscription.id;
    // subscription.billingPeriodStart = new Date(
    //   (stripeSubscription as any).current_period_start * 1000
    // );
    // subscription.billingPeriodEnd = new Date(
    //   (stripeSubscription as any).current_period_end * 1000
    // );
    // await subscription.save();

    // Update user subscription details
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    // await User.findByIdAndUpdate(subscription.userId, {
    //   leaguesCreatedCount: 0,
    //   leaguesJoinedCount: 0,
    //   isOrganizer: plan === 'club',
    // });

    return {
      subscriptionId: stripeSubscription.id,
    //   plan: subscription.plan,
      status: 'active',
    //   nextBillingDate: subscription.billingPeriodEnd,
    //   amount: subscription.amount,
    };
  } catch (error: any) {
    // Update payment status to failed
    await RecurringSubscription.updateOne(
      { initialPaymentIntentId: paymentIntentId },
      { status: 'failed' }
    );

    if (error instanceof AppError) throw error;
    throw new AppError(500, error.message ?? 'Failed to confirm payment');
  }
};

// ─── Cancel Recurring Subscription ─────────────────────────────────────────
export const cancelRecurringSubscription = async (
  userId: string,
  reason?: string
) => {
  try {
    const subscription = await RecurringSubscription.findOne({
      userId,
      status: { $in: ['active', 'past_due'] },
    });

    if (!subscription) {
      throw new AppError(404, 'Active subscription not found');
    }

    // Cancel Stripe subscription
    if (subscription.stripeSubscriptionId) {
      await (stripe.subscriptions as any).del(subscription.stripeSubscriptionId);
    }

    // Update subscription record
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    subscription.cancelReason = reason;
    await subscription.save();

    return {
      subscriptionId: subscription.stripeSubscriptionId,
      status: 'canceled',
      canceledAt: subscription.canceledAt,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, error.message ?? 'Failed to cancel subscription');
  }
};

// ─── Get Active Subscription Status ──────────────────────────────────────────
export const getRecurringSubscriptionStatus = async (userId: string) => {
  try {
    const subscription = await RecurringSubscription.findOne({
      userId,
      status: { $in: ['active', 'pending', 'past_due'] },
    });

    if (!subscription) {
      return null;
    }

    return {
      userId: subscription.userId,
      plan: subscription.plan,
      status: subscription.status,
      isActive: subscription.status === 'active',
      nextBillingDate: subscription.billingPeriodEnd,
      amount: subscription.amount,
      failureCount: subscription.failureCount,
    };
  } catch (error: any) {
    throw new AppError(500, error.message ?? 'Failed to fetch subscription status');
  }
};

// ─── Get Subscription History ────────────────────────────────────────────────
export const getRecurringSubscriptionHistory = async (userId: string) => {
  try {
    const subscriptions = await RecurringSubscription.find({ userId }).sort({
      createdAt: -1,
    });

    return subscriptions.map((sub) => ({
      subscriptionId: sub.stripeSubscriptionId,
      plan: sub.plan,
      status: sub.status,
      amount: sub.amount,
      startDate: sub.createdAt,
      endDate: sub.billingPeriodEnd,
      canceledAt: sub.canceledAt,
      cancelReason: sub.cancelReason,
    }));
  } catch (error: any) {
    throw new AppError(500, error.message ?? 'Failed to fetch subscription history');
  }
};

// ─── Handle Invoice Paid (for webhook) ─────────────────────────────────────
export const handleInvoicePaidWebhook = async (event: any) => {
  const invoice = event.data.object;

  try {
    const subscription = await RecurringSubscription.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (!subscription) {
      console.log('Subscription not found for invoice:', invoice.subscription);
      return;
    }

    // Update billing period
    subscription.billingPeriodStart = new Date(invoice.period_start * 1000);
    subscription.billingPeriodEnd = new Date(invoice.period_end * 1000);
    subscription.status = 'active';
    subscription.failureCount = 0;
    await subscription.save();

    console.log('Invoice processed for subscription:', subscription._id);
  } catch (error: any) {
    console.error('Error handling invoice.paid webhook:', error);
  }
};

// ─── Handle Invoice Payment Failed (for webhook) ───────────────────────────
export const handleInvoicePaymentFailedWebhook = async (event: any) => {
  const invoice = event.data.object;

  try {
    const subscription = await RecurringSubscription.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (!subscription) {
      console.log('Subscription not found for invoice:', invoice.subscription);
      return;
    }

    // Increment failure count
    subscription.failureCount += 1;
    subscription.lastFailureDate = new Date();
    subscription.lastFailureReason = invoice.last_error?.message || 'Payment failed';

    // If 3 failures, suspend subscription
    if (subscription.failureCount >= 3) {
      subscription.status = 'failed';
    } else {
      subscription.status = 'past_due';
    }

    await subscription.save();

    console.log(
      `Invoice payment failed. Failure count: ${subscription.failureCount}`
    );
  } catch (error: any) {
    console.error('Error handling invoice.payment_failed webhook:', error);
  }
};

// ─── Handle Subscription Deleted (for webhook) ────────────────────────────
export const handleSubscriptionDeletedWebhook = async (event: any) => {
  const stripeSubscription = event.data.object;

  try {
    const subscription = await RecurringSubscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (!subscription) {
      console.log(
        'Subscription not found for Stripe ID:',
        stripeSubscription.id
      );
      return;
    }

    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    await subscription.save();

    console.log('Subscription deleted:', subscription._id);
  } catch (error: any) {
    console.error('Error handling subscription.deleted webhook:', error);
  }
};

import Stripe from 'stripe';
import AppError from '../../error/appError';
import { PLAN_DETAILS, SubscriptionPlanType } from '../subscription/subscription.constant';
import User from '../user/user.model';
import { ICreateAutoSubscriptionPayload } from './autoSubscription.interface';
import { AutoSubscription } from './autoSubscription.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

// ─── Create Checkout Session ──────────────────────────────────────────────────
/**
 * Creates a Stripe Checkout session and returns the payment link
 * User will pay through this link, and Stripe will handle everything
 * @param payload - userId, plan
 * @returns Checkout session with payment link
 */
const createCheckoutSession = async (payload: ICreateAutoSubscriptionPayload) => {
  const { userId, plan } = payload;

  // Validate plan
  if (!['basic', 'gold', 'club'].includes(plan)) {
    throw new AppError(400, 'Invalid plan. Must be basic, gold, or club');
  }

  const planDetails = PLAN_DETAILS[plan as SubscriptionPlanType];
  if (!planDetails) {
    throw new AppError(400, 'Plan details not found');
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Check if user already has active auto-subscription
  const existingSubscription = await AutoSubscription.findOne({
    userId,
    status: 'active',
  });
  if (existingSubscription) {
    throw new AppError(400, 'User already has an active auto-subscription. Cancel it first.');
  }

  try {
    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: {
          userId: userId.toString(),
        },
      });
      customerId = customer.id;

      // Save Stripe customer ID to user
      await User.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    }

    // Map plan to Stripe price ID
    const stripePriceIdMap: Record<string, string> = {
      basic: process.env.STRIPE_PRICE_ID_BASIC || 'price_basic_monthly',
      gold: process.env.STRIPE_PRICE_ID_GOLD || 'price_gold_monthly',
      club: process.env.STRIPE_PRICE_ID_CLUB || 'price_club_monthly',
    };

    const stripePriceId = stripePriceIdMap[plan];

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: userId.toString(),
        plan,
      },
    });

    // Create pending auto-subscription record
    const autoSubscription = new AutoSubscription({
      userId,
      plan,
      status: 'pending',
      stripeCustomerId: customerId,
      stripePriceId,
      amount: planDetails.price,
      currency: 'usd',
      autoRenewEnabled: true,
      stripeSubscriptionId: '', // Will be filled by webhook after payment
      paymentMethodId: '',
    });

    await autoSubscription.save();

    return {
      success: true,
      message: 'Checkout session created. Send this link to user.',
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
        plan,
        amount: planDetails.price,
      },
    };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw new AppError(500, error.message ?? 'Failed to create checkout session');
  }
};

// ─── Confirm Payment ──────────────────────────────────────────────────────────
/**
 * Confirms payment after user completes checkout
 * Checks Stripe session status and activates subscription if paid
 * @param sessionId - Checkout session ID from Stripe
 * @returns Confirmation result
 */
const confirmPayment = async (sessionId: string) => {
  if (!sessionId) {
    throw new AppError(400, 'sessionId is required');
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      throw new AppError(400, `Payment not completed. Current status: ${session.payment_status}`);
    }

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;

    if (!userId || !plan) {
      throw new AppError(500, 'Session metadata missing');
    }

    // Find the pending auto-subscription
    const autoSub = await AutoSubscription.findOne({
      userId,
      status: 'pending',
    });

    if (!autoSub) {
      throw new AppError(404, 'Auto-subscription record not found');
    }

    // Get subscription ID from session
    const subscriptionId = typeof session.subscription === 'string' 
      ? session.subscription 
      : session.subscription?.id;

    if (!subscriptionId) {
      throw new AppError(500, 'Subscription ID not found in session');
    }

    // Retrieve the subscription to get billing details
    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId as string);
    const subscription = subscriptionResponse as unknown as any;

    // Update auto-subscription to active
    // const updatedSub = await AutoSubscription.findByIdAndUpdate(
    //   autoSub._id,
    //   {
    //     status: 'active',
    //     stripeSubscriptionId: subscriptionId,
    //     currentPeriodStart: new Date(subscription.current_period_start * 1000),
    //     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    //     nextBillingDate: new Date(subscription.current_period_end * 1000),
    //   },
    //   { new: true }
    // );

    // Update user
    await User.findByIdAndUpdate(userId, {
      leaguesCreatedCount: 0,
      leaguesJoinedCount: 0,
      isOrganizer: plan === 'club',
    });

    return {
      success: true,
      message: 'Payment confirmed and subscription activated',
      data: {
        subscriptionId,
        plan,
        status: 'active',
        // nextBillingDate: updatedSub?.nextBillingDate,
      },
    };
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    throw new AppError(500, error.message ?? 'Failed to confirm payment');
  }
};


// ─── Cancel Auto-Subscription ─────────────────────────────────────────────────
const cancelAutoSubscription = async (userId: string, reason?: string) => {
  const subscription = await AutoSubscription.findOne({
    userId,
    status: 'active',
  });

  if (!subscription) {
    throw new AppError(404, 'No active auto-subscription found for this user');
  }

  try {
    // Cancel the Stripe subscription
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

    // Update database record
    await AutoSubscription.findByIdAndUpdate(subscription._id, {
      status: 'canceled',
      canceledAt: new Date(),
      cancelReason: reason || 'User requested cancellation',
      autoRenewEnabled: false,
    });

    // Reset user organizer status if they had Club plan
    if (subscription.plan === 'club') {
      await User.findByIdAndUpdate(userId, { isOrganizer: false });
    }

    return {
      success: true,
      message: 'Auto-subscription canceled successfully',
    };
  } catch (error: any) {
    console.error('Error canceling auto-subscription:', error);
    throw new AppError(500, error.message ?? 'Failed to cancel auto-subscription');
  }
};

// ─── Get Subscription Status ──────────────────────────────────────────────────
const getSubscriptionStatus = async (userId: string) => {
  const subscription = await AutoSubscription.findOne({
    userId,
    status: { $in: ['active', 'suspended', 'failed'] },
  }).lean();

  if (!subscription) {
    return null;
  }

  const planDetails = PLAN_DETAILS[subscription.plan as SubscriptionPlanType];

  return {
    ...subscription,
    planDetails,
    isActive: subscription.status === 'active',
  };
};

export const autoSubscriptionServices = {
  createCheckoutSession,
  confirmPayment,
  cancelAutoSubscription,
  getSubscriptionStatus,
};

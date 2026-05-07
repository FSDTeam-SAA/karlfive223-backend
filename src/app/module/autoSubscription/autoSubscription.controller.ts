import { Request, Response } from 'express';
import Stripe from 'stripe';
import AppError from '../../error/appError';
import catchAsycn from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendRespopnse';
import { PLAN_DETAILS } from '../subscription/subscription.constant';
import { AutoSubscription } from './autoSubscription.model';
import { autoSubscriptionServices } from './autoSubscription.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

// ─── Create Checkout Session ──────────────────────────────────────────────────
/**
 * POST /auto-subscription/create-checkout
 * Body: { userId, plan: 'basic'|'gold'|'club' }
 * 
 * Creates a Stripe Checkout session and returns the payment link
 * User will visit this link to pay through Stripe
 */
export const createCheckoutSession = catchAsycn(async (req: Request, res: Response) => {
  const { userId, plan } = req.body;

  // Validate required fields
  if (!userId || !plan) {
    throw new AppError(400, 'userId and plan are required');
  }

  if (!['basic', 'gold', 'club'].includes(plan)) {
    throw new AppError(400, "plan must be one of 'basic', 'gold', 'club'");
  }

  const result = await autoSubscriptionServices.createCheckoutSession({
    userId,
    plan,
    paymentMethodId: '', // Not used in simplified flow
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: result.message,
    data: result.data,
  });
});

// ─── Confirm Payment ──────────────────────────────────────────────────────────
/**
 * POST /auto-subscription/confirm-payment
 * Body: { sessionId }
 * 
 * Confirms payment after user completes checkout
 * Checks Stripe session and activates subscription if paid
 */
export const confirmPayment = catchAsycn(async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    throw new AppError(400, 'sessionId is required');
  }

  const result = await autoSubscriptionServices.confirmPayment(sessionId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result.data,
  });
});

// ─── Get Auto-Subscription Status ─────────────────────────────────────────────
/**
 * GET /auto-subscription/status/:userId
 * 
 * Returns the user's active auto-subscription status
 */
export const getAutoSubscriptionStatus = catchAsycn(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const subscription = await autoSubscriptionServices.getSubscriptionStatus(userId);

  if (!subscription) {
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'No active auto-subscription found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Auto-subscription status retrieved',
    data: subscription,
  });
});

// ─── Cancel Auto-Subscription ────────────────────────────────────────────────
/**
 * POST /auto-subscription/cancel
 * Body: { userId, reason?: string }
 * 
 * Cancels the user's active auto-subscription
 * User will not be charged again after this
 */
export const cancelAutoSubscription = catchAsycn(async (req: Request, res: Response) => {
  const { userId, reason } = req.body;

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const result = await autoSubscriptionServices.cancelAutoSubscription(userId, reason);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

// ─── Get All Auto-Subscriptions (Admin) ──────────────────────────────────────
/**
 * GET /auto-subscription/all
 * 
 * Returns all auto-subscriptions (admin only)
 */
export const getAllAutoSubscriptions = catchAsycn(async (_req: Request, res: Response) => {
  const subscriptions = await AutoSubscription.find()
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All auto-subscriptions retrieved',
    data: subscriptions,
  });
});


// ─── Get Auto-Subscription Plans Info ────────────────────────────────────────
/**
 * GET /auto-subscription/plans
 * 
 * Returns available subscription plans with pricing
 */
export const getAutoSubscriptionPlans = catchAsycn(async (_req: Request, res: Response) => {
  const plans = {
    basic: {
      ...PLAN_DETAILS.basic,
      stripePriceId: process.env.STRIPE_PRICE_ID_BASIC || 'price_basic_monthly',
    },
    gold: {
      ...PLAN_DETAILS.gold,
      stripePriceId: process.env.STRIPE_PRICE_ID_GOLD || 'price_gold_monthly',
    },
    club: {
      ...PLAN_DETAILS.club,
      stripePriceId: process.env.STRIPE_PRICE_ID_CLUB || 'price_club_monthly',
    },
  };

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Auto-subscription plans',
    data: plans,
  });
});

// ─── Get Subscription History ────────────────────────────────────────────────
/**
 * GET /auto-subscription/history/:userId
 * 
 * Returns all auto-subscriptions for a user (active and past)
 */
export const getSubscriptionHistory = catchAsycn(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const subscriptions = await AutoSubscription.find({ userId })
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription history retrieved',
    data: subscriptions,
  });
});

import { Request, Response } from 'express';
import AppError from '../../error/appError';
import catchAsycn from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendRespopnse';
import { PLAN_DETAILS } from '../subscription/subscription.constant';
import { RecurringSubscription } from './recurringSubscription.model';
import {
    cancelRecurringSubscription,
    confirmRecurringPayment,
    createRecurringPaymentIntent,
    getRecurringSubscriptionHistory,
    getRecurringSubscriptionStatus,
} from './recurringSubscription.service';
import { handleRecurringSubscriptionWebhook } from './recurringSubscription.webhook';

// ─── Create Payment Intent for Recurring Subscription ──────────────────────
export const createRecurringPayment = catchAsycn(async (req, res) => {
  const { plan='basic', amount } = req.body;
  const userId = String(req.user?._id || req.user?.id || '');

  if (!userId || !plan || !amount) {
    throw new AppError(400, 'userId, plan, and amount are required');
  }

  const result = await createRecurringPaymentIntent({
    userId,
    plan,
    amount,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment intent created for recurring subscription',
    data: result,
  });
});

// ─── Confirm Payment and Activate Subscription ──────────────────────────────
export const confirmRecurringPaymentHandler = catchAsycn(async (req, res) => {
  const { setupIntentId, paymentMethodId } = req.body;
  const userId = String(req.user?._id || req.user?.id || '');

  if (!setupIntentId) {
    throw new AppError(
      400,
      'setupIntentId is required'
    );
  }

  const result = await confirmRecurringPayment({
    userId,
    setupIntentId,
    paymentMethodId,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription confirmed and activated',
    data: result,
  });
});

// ─── Get Subscription Status ────────────────────────────────────────────────
export const getSubscriptionStatus = catchAsycn(async (req, res) => {
  const userId = String(req.user?._id || req.user?.id || '');

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const subscription = await getRecurringSubscriptionStatus(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: subscription
      ? 'Subscription found'
      : 'No active subscription found',
    data: subscription || null,
  });
});

// ─── Get Subscription History ──────────────────────────────────────────────
export const getSubscriptionHistory = catchAsycn(async (req, res) => {
  const userId = String(req.user?._id || req.user?.id || '');

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const history = await getRecurringSubscriptionHistory(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription history fetched',
    data: history,
  });
});

// ─── Cancel Subscription ────────────────────────────────────────────────────
export const cancelSubscriptionHandler = catchAsycn(async (req, res) => {
  const { reason } = req.body;
  const userId = String(req.user?._id || req.user?.id || '');

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const result = await cancelRecurringSubscription(userId, reason);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription canceled successfully',
    data: result,
  });
});

// ─── Get Available Plans ────────────────────────────────────────────────────
export const getPlans = catchAsycn(async (_req, res) => {
  const plans = Object.entries(PLAN_DETAILS).filter(([key]) => key !== 'free').map(([key, value]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    price: value.price,
    firstMonthFree: true,
  }));

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Plans fetched successfully',
    data: plans,
  });
});

// ─── Admin: Get All Recurring Subscriptions ────────────────────────────────
export const getAllSubscriptions = catchAsycn(async (_req, res) => {
  const subscriptions = await RecurringSubscription.find()
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All recurring subscriptions',
    data: subscriptions,
  });
});

// ─── Admin: Get Recurring Subscription Analytics ───────────────────────────
export const getRecurringAnalytics = catchAsycn(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage: any = {};

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      const start = new Date(String(startDate));
      start.setHours(0, 0, 0, 0);
      matchStage.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt.$lte = end;
    }
  }

  const [activeSubscriptions, totalRevenue, byPlan, failedPayments] =
    await Promise.all([
      RecurringSubscription.countDocuments({
        status: 'active',
        ...matchStage,
      }),
      RecurringSubscription.aggregate([
        { $match: { status: 'active', ...matchStage } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
      RecurringSubscription.aggregate([
        { $match: { ...matchStage } },
        {
          $group: {
            _id: '$plan',
            count: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
      ]),
      RecurringSubscription.countDocuments({
        status: 'failed',
        ...matchStage,
      }),
    ]);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Recurring subscription analytics',
    data: {
      activeSubscriptions,
      totalRevenue: totalRevenue[0]?.total || 0,
      byPlan,
      failedPayments,
    },
  });
});

// ─── Handle Stripe Webhook ────────────────────────────────────────────────
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ error: 'No Stripe signature found' });
    }

    const result = await handleRecurringSubscriptionWebhook(
      req.body as Buffer,
      signature
    );

    res.json(result);
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(error.statusCode || 400).json({
      error: error.message || 'Webhook processing failed',
    });
  }
};

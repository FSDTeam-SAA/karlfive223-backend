import { Request, Response } from 'express';
import catchAsycn from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendRespopnse';
import { subscriptionService } from './subscription.service';

// ─── GET /subscription/plans ──────────────────────────────────────────────────
export const getPlans = catchAsycn(async (_req: Request, res: Response) => {
  const plans = subscriptionService.getPlans();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription plans fetched successfully',
    data: plans,
  });
});

// ─── GET /subscription/my-subscription ───────────────────────────────────────
export const getMySubscription = catchAsycn(
  async (req: Request, res: Response) => {
    const userId = req.user._id as string;
    const subscription = await subscriptionService.getMySubscription(userId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Active subscription fetched',
      data: subscription ?? null,
    });
  }
);

// ─── GET /subscription/history ────────────────────────────────────────────────
export const getSubscriptionHistory = catchAsycn(
  async (req: Request, res: Response) => {
    const userId = req.user._id as string;
    const history = await subscriptionService.getSubscriptionHistory(userId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Subscription history fetched',
      data: history,
    });
  }
);

/*
 * LEGACY OTP / coupon free-subscription handlers — DISABLED.
 * These old handlers granted a 30-day plan without collecting a Stripe card.
 * They are preserved in source history in subscription.service.ts but are not
 * exported or mounted. The active free first month is Stripe trialing status.
 */
// export const claimFreeTrialWithOtp = catchAsycn(/* legacy OTP handler */);
// export const activateFreeTrial = catchAsycn(/* legacy free-trial handler */);

// ─── POST /subscription/expire (admin / cron) ─────────────────────────────────
export const expireSubscriptions = catchAsycn(
  async (_req: Request, res: Response) => {
    const result = await subscriptionService.expireSubscriptions();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Expired subscriptions processed',
      data: result,
    });
  }
);

// ─── GET /subscription/all (admin) ────────────────────────────────────────────
export const getAllSubscriptions = catchAsycn(
  async (_req: Request, res: Response) => {
    const data = await subscriptionService.getAllSubscriptions();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'All subscriptions fetched',
      data,
    });
  }
);

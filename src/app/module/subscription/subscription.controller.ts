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

// ─── POST /subscription/claim-free-trial ──────────────────────────────────────
// New endpoint: Users claim free 30-day trial using event OTP or coupon code
export const claimFreeTrialWithOtp = catchAsycn(
  async (req: Request, res: Response) => {
    const userId = req.user._id as string;
    const { code } = req.body;

    if (!code) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: 'Code (OTP or coupon) is required',
      });
      return;
    }

    const result = await subscriptionService.claimFreeTrialWithOtp(userId, code);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.codeType === 'coupon' 
        ? 'Coupon redeemed successfully - 30-day subscription activated'
        : '30-day free trial activated successfully using event OTP',
      data: {
        subscription: result.freePayment,
        codeType: result.codeType,
        event: result.event,
        coupon: result.coupon,
      },
    });
  }
);

// ─── POST /subscription/activate-free-trial [DEPRECATED] ──────────────────────
// This endpoint is deprecated. Users should now use /claim-free-trial with OTP or coupon.
// Now grants 30-day free trial instead of 24 hours.
export const activateFreeTrial = catchAsycn(
  async (req: Request, res: Response) => {
    const userId = req.user._id as string;
    const freeTrial = await subscriptionService.assignFreeTrial(userId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: '[DEPRECATED] 30-day free trial activated. Please use /claim-free-trial with event OTP or coupon instead.',
      data: freeTrial,
    });
  }
);

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

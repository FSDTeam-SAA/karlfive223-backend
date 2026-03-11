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
// New endpoint: Users claim their one-time 24hr free trial using an event OTP
export const claimFreeTrialWithOtp = catchAsycn(
  async (req: Request, res: Response) => {
    const userId = req.user._id as string;
    const { otp } = req.body;

    if (!otp) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: 'OTP is required',
      });
      return;
    }

    const result = await subscriptionService.claimFreeTrialWithOtp(userId, otp);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: '24-hour free trial activated successfully using event OTP',
      data: {
        subscription: result.freePayment,
        event: result.event,
      },
    });
  }
);

// ─── POST /subscription/activate-free-trial [DEPRECATED] ──────────────────────
// This endpoint is deprecated. Users should now use /claim-free-trial with OTP.
// Kept for backward compatibility.
export const activateFreeTrial = catchAsycn(
  async (req: Request, res: Response) => {
    const userId = req.user._id as string;
    const freeTrial = await subscriptionService.assignFreeTrial(userId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: '[DEPRECATED] 24-hour free trial activated. Please use /claim-free-trial with event OTP instead.',
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

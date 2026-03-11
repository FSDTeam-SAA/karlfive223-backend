import AppError from '../../error/appError';
import { eventService } from '../event/event.service';
import { Payment } from '../payment/payment.model';
import User from '../user/user.model';
import {
    PLAN_DETAILS,
    SUBSCRIPTION_PLANS
} from './subscription.constant';

// ─── Get all available plans (public) ────────────────────────────────────────
const getPlans = () => {
  return Object.entries(PLAN_DETAILS).map(([key, value]) => ({
    planKey: key,
    ...value,
  }));
};

// ─── Get current active subscription for a user (reads from Payment) ─────────
const getMySubscription = async (userId: string) => {
  const active = await Payment.findOne({
    userId,
    type: 'subscription',
    status: 'success',
    expiryDate: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  return active ?? null;
};

// ─── Claim free trial using Event OTP ────────────────────────────────────────
// Users can only get free trial by providing a valid OTP from an approved event.
const claimFreeTrialWithOtp = async (userId: string, otp: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  if (user.freeTrialUsed) {
    throw new AppError(400, 'Free trial has already been used');
  }

  // Validate OTP via event service
  const event = await eventService.validateEventOtp(otp);

  // Create free trial payment record
  const plan = PLAN_DETAILS[SUBSCRIPTION_PLANS.FREE];
  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // +24 h

  const freePayment = await Payment.create({
    userId,
    amount: 0,
    type: 'subscription',
    subscriptionPlan: SUBSCRIPTION_PLANS.FREE,
    status: 'success',
    expiryDate,
  });

  // Mark free trial as used and reset league counters
  await User.findByIdAndUpdate(userId, {
    freeTrialUsed: true,
    leaguesCreatedCount: 0,
    leaguesJoinedCount: 0,
  });

  // Increment OTP usage count for tracking
  await eventService.incrementOtpUsage((event as any)._id.toString());

  return { freePayment, event };
};

// ─── Assign free 24-hour trial on registration (legacy, now deprecated) ──────
// This function is kept for backward compatibility but should not be used.
// New users should claim free trial via OTP from approved events.
const assignFreeTrial = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  if (user.freeTrialUsed) {
    throw new AppError(400, 'Free trial has already been used');
  }

  const plan = PLAN_DETAILS[SUBSCRIPTION_PLANS.FREE];

  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // +24 h

  const freePayment = await Payment.create({
    userId,
    amount: 0,
    type: 'subscription',
    subscriptionPlan: SUBSCRIPTION_PLANS.FREE,
    status: 'success',
    expiryDate,
  });

  await User.findByIdAndUpdate(userId, {
    freeTrialUsed: true,
    leaguesCreatedCount: 0,
    leaguesJoinedCount: 0,
  });

  return freePayment;
};

// ─── Subscription history for a user ─────────────────────────────────────────
const getSubscriptionHistory = async (userId: string) => {
  return Payment.find({ userId, type: 'subscription' }).sort({ createdAt: -1 });
};

// ─── Admin: get all subscription payments ────────────────────────────────────
const getAllSubscriptions = async () => {
  return Payment.find({ type: 'subscription' })
    .populate('userId', 'name email isOrganizer')
    .sort({ createdAt: -1 });
};

// ─── Expire subscriptions (admin / cron) ─────────────────────────────────────
// Payments auto-expire via expiryDate field — this just resets isOrganizer
// for users whose club plan has expired and who have no other active club plan.
const expireSubscriptions = async () => {
  const expiredClubPayments = await Payment.find({
    type: 'subscription',
    subscriptionPlan: 'club',
    status: 'success',
    expiryDate: { $lte: new Date() },
  }).distinct('userId');

  for (const uid of expiredClubPayments) {
    // Check if user still has any active club plan payment
    const stillActive = await Payment.findOne({
      userId: uid,
      type: 'subscription',
      subscriptionPlan: 'club',
      status: 'success',
      expiryDate: { $gt: new Date() },
    });
    if (!stillActive) {
      await User.findByIdAndUpdate(uid, { isOrganizer: false });
    }
  }

  return { message: 'Expired club subscriptions processed' };
};

export const subscriptionService = {
  getPlans,
  getMySubscription,
  claimFreeTrialWithOtp,
  assignFreeTrial, // Deprecated - kept for backward compatibility
  getSubscriptionHistory,
  getAllSubscriptions,
  expireSubscriptions,
};

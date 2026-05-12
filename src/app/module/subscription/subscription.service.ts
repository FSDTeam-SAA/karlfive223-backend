import AppError from '../../error/appError';
import Coupon from '../coupon/coupon.model';
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

// ─── Claim free trial using Event OTP or Coupon Code ────────────────────────
// Users can get free trial by providing either:
// 1. A valid OTP from an approved event
// 2. A valid 5-digit coupon code from a manager/organizer (active period)
const claimFreeTrialWithOtp = async (userId: string, code: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const normalizedCode = code?.trim();
  if (!normalizedCode) {
    throw new AppError(400, 'Code (OTP or coupon) is required');
  }

  const now = new Date();
  const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  let couponRecord = null;
  let eventRecord = null;
  let codeType = 'unknown';

  // Check if it's a coupon code (5 digits)
  if (/^\d{5}$/.test(normalizedCode)) {
    const coupon = await Coupon.findOne({ code: normalizedCode });
    if (coupon) {
      if (coupon.startDate > now || coupon.endDate < now || coupon.status === 'expired') {
        throw new AppError(400, 'Coupon is not running right now');
      }
      couponRecord = coupon;
      codeType = 'coupon';
    }
  }

  // If not a coupon, try as event OTP
  if (!couponRecord) {
    try {
      const event = await eventService.validateEventOtp(normalizedCode);
      eventRecord = event;
      codeType = 'otp';
    } catch (err: any) {
      throw new AppError(404, 'Invalid code: coupon or OTP not found or expired');
    }
  }

  // For coupon: check if already redeemed
  if (codeType === 'coupon') {
    const alreadyUsed = await Payment.findOne({
      userId,
      type: 'subscription',
      status: 'success',
      couponCode: normalizedCode,
    });

    if (alreadyUsed) {
      throw new AppError(400, 'You already redeemed this coupon');
    }
  }

  // For OTP: check if free trial already used
  if (codeType === 'otp' && user.freeTrialUsed) {
    throw new AppError(400, 'Free trial has already been used');
  }

  // Calculate expiry
  const expiryDate = new Date(now.getTime() + TRIAL_DURATION_MS);

  // Check for active subscription
  const activeSubscription = await Payment.findOne({
    userId,
    type: 'subscription',
    status: 'success',
    expiryDate: { $gt: now },
  }).sort({ createdAt: -1 });

  let freePayment;
  const planForCoupon = codeType === 'coupon' ? SUBSCRIPTION_PLANS.CLUB : SUBSCRIPTION_PLANS.FREE;

  if (activeSubscription) {
    // Extend existing subscription
    const currentExpiry = activeSubscription.expiryDate
      ? new Date(activeSubscription.expiryDate)
      : now;

    const updatedExpiry = new Date(
      Math.max(currentExpiry.getTime(), expiryDate.getTime())
    );

    freePayment = await Payment.findByIdAndUpdate(
      activeSubscription._id,
      {
        expiryDate: updatedExpiry,
        ...(codeType === 'coupon' && couponRecord ? {
          couponCode: normalizedCode,
          couponId: couponRecord._id,
          couponAppliedAt: now,
          couponRewardDays: 30,
        } : {}),
      },
      { new: true }
    );
  } else {
    // Create new subscription (free for OTP, club/organizer for coupon)
    freePayment = await Payment.create({
      userId,
      amount: 0,
      type: 'subscription',
      subscriptionPlan: planForCoupon,
      status: 'success',
      expiryDate,
      ...(codeType === 'coupon' && couponRecord ? {
        couponCode: normalizedCode,
        couponId: couponRecord._id,
        couponAppliedAt: now,
        couponRewardDays: 30,
      } : {}),
    });
  }

  // Mark free trial as used (only for OTP)
  if (codeType === 'otp') {
    await User.findByIdAndUpdate(userId, {
      freeTrialUsed: true,
      leaguesCreatedCount: 0,
      leaguesJoinedCount: 0,
    });

    // Increment OTP usage count for tracking
    await eventService.incrementOtpUsage((eventRecord as any)._id.toString());
  }

  // For coupon: grant organizer status and increment redemption count
  if (codeType === 'coupon' && couponRecord) {
    await User.findByIdAndUpdate(userId, {
      isOrganizer: true,
      leaguesCreatedCount: 0,
      leaguesJoinedCount: 0,
    });

    await Coupon.findByIdAndUpdate(couponRecord._id, {
      $inc: { redeemedCount: 1 },
    });
  }

  return {
    freePayment,
    event: eventRecord,
    coupon: couponRecord,
    codeType,
  };
};

// ─── Assign free 30-day trial on registration (legacy, now deprecated) ──────
// This function is kept for backward compatibility but should not be used.
// New users should claim free trial via OTP from approved events or coupon code.
const assignFreeTrial = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  if (user.freeTrialUsed) {
    throw new AppError(400, 'Free trial has already been used');
  }

  const plan = PLAN_DETAILS[SUBSCRIPTION_PLANS.FREE];

  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

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

import { Payment } from '../payment/payment.model';
import User from '../user/user.model';
import { PLAN_DETAILS } from './subscription.constant';

const getPlans = () => Object.entries(PLAN_DETAILS)
  .filter(([key]) => key !== 'free')
  .map(([key, value]) => ({ planKey: key, ...value, firstMonthFree: true }));

// The recurring Stripe record is the source of truth for new subscriptions.
// Payment is also maintained by recurring webhooks for legacy enforcement/history.
const getMySubscription = async (userId: string) => Payment.findOne({
  userId,
  type: 'subscription',
  status: 'success',
  subscriptionStatus: { $in: ['trialing', 'active'] },
  expiryDate: { $gt: new Date() },
}).sort({ createdAt: -1 });

/*
 * LEGACY OTP / MANAGER-COUPON FREE-SUBSCRIPTION FLOW — DISABLED
 *
 * Kept here intact for a possible future restoration. It is deliberately not
 * exported and no route calls it. A free month now requires Stripe card setup
 * and is created by recurringSubscription.service.ts.
 *
import AppError from '../../error/appError';
import Coupon from '../coupon/coupon.model';
import { eventService } from '../event/event.service';
import { SUBSCRIPTION_PLANS } from './subscription.constant';
const claimFreeTrialWithOtp = async (userId: string, code: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  const normalizedCode = code?.trim();
  if (!normalizedCode) throw new AppError(400, 'Code (OTP or coupon) is required');
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let couponRecord = null;
  let eventRecord = null;
  let codeType = 'unknown';
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
  if (!couponRecord) {
    eventRecord = await eventService.validateEventOtp(normalizedCode);
    codeType = 'otp';
  }
  if (codeType === 'otp' && user.freeTrialUsed) throw new AppError(400, 'Free trial has already been used');
  const freePayment = await Payment.create({
    userId, amount: 0, type: 'subscription', subscriptionPlan: codeType === 'coupon'
      ? SUBSCRIPTION_PLANS.CLUB : SUBSCRIPTION_PLANS.FREE,
    status: 'success', expiryDate,
  });
  if (codeType === 'otp') {
    await User.findByIdAndUpdate(userId, { freeTrialUsed: true, leaguesCreatedCount: 0, leaguesJoinedCount: 0 });
    await eventService.incrementOtpUsage((eventRecord as any)._id.toString());
  }
  if (codeType === 'coupon' && couponRecord) {
    await User.findByIdAndUpdate(userId, { isOrganizer: true, leaguesCreatedCount: 0, leaguesJoinedCount: 0 });
    await Coupon.findByIdAndUpdate(couponRecord._id, { $inc: { redeemedCount: 1 } });
  }
  return { freePayment, event: eventRecord, coupon: couponRecord, codeType };
};

const assignFreeTrial = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  if (user.freeTrialUsed) throw new AppError(400, 'Free trial has already been used');
  const freePayment = await Payment.create({
    userId, amount: 0, type: 'subscription', subscriptionPlan: SUBSCRIPTION_PLANS.FREE,
    status: 'success', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  await User.findByIdAndUpdate(userId, { freeTrialUsed: true, leaguesCreatedCount: 0, leaguesJoinedCount: 0 });
  return freePayment;
};
*/

const getSubscriptionHistory = async (userId: string) =>
  Payment.find({ userId, type: 'subscription' }).sort({ createdAt: -1 });

const getAllSubscriptions = async () => Payment.find({ type: 'subscription' })
  .populate('userId', 'name email isOrganizer')
  .sort({ createdAt: -1 });

const expireSubscriptions = async () => {
  const expiredClubPayments = await Payment.find({
    type: 'subscription', subscriptionPlan: 'club', status: 'success', expiryDate: { $lte: new Date() },
  }).distinct('userId');
  for (const userId of expiredClubPayments) {
    const stillActive = await Payment.findOne({
      userId, type: 'subscription', subscriptionPlan: 'club', status: 'success',
      subscriptionStatus: { $in: ['trialing', 'active'] }, expiryDate: { $gt: new Date() },
    });
    if (!stillActive) await User.findByIdAndUpdate(userId, { isOrganizer: false });
  }
  return { message: 'Expired club subscriptions processed' };
};

export const subscriptionService = {
  getPlans,
  getMySubscription,
  getSubscriptionHistory,
  getAllSubscriptions,
  expireSubscriptions,
};

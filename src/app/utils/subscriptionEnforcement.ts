/**
 * Subscription enforcement utilities.
 * Reads the active subscription from the Payment collection
 * (type='subscription', status='success', expiryDate > now).
 */

import AppError from '../error/appError';
import League from '../module/league/league.model';
import { Payment } from '../module/payment/payment.model';
import { PLAN_DETAILS, SubscriptionPlanType } from '../module/subscription/subscription.constant';
import User from '../module/user/user.model';

// ─── Get the user's current active subscription payment ──────────────────────
export const getActiveSubscriptionPayment = async (userId: string) => {
  return Payment.findOne({
    userId,
    type: 'subscription',
    status: 'success',
    expiryDate: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

// ─── Check whether the user can CREATE a new private league ──────────────────
export const enforceCreateLeagueLimit = async (
  userId: string,
  leagueType: 'public' | 'private'
) => {
  if (leagueType !== 'private') return; // public leagues have no restriction

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const activePayment = await getActiveSubscriptionPayment(userId);

  if (!activePayment) {
    throw new AppError(
      403,
      'You need an active subscription to create a private league.'
    );
  }

  const planDetails = PLAN_DETAILS[activePayment.subscriptionPlan as SubscriptionPlanType];
  if (!planDetails) {
    throw new AppError(403, 'Invalid subscription plan on record.');
  }

  // null = unlimited, skip the count check
  if (planDetails.maxCreateLeagues === null) return;

  if (user.leaguesCreatedCount >= planDetails.maxCreateLeagues) {
    throw new AppError(
      403,
      `Your ${activePayment.subscriptionPlan} plan allows creating at most ${planDetails.maxCreateLeagues} private leagues per billing period. Please upgrade your plan.`
    );
  }
};

// ─── Increment the user's leaguesCreatedCount after successful create ─────────
export const incrementLeaguesCreated = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { $inc: { leaguesCreatedCount: 1 } });
};

// ─── Check whether the user can JOIN a new private league ────────────────────
export const enforceJoinLeagueLimit = async (
  userId: string,
  leagueId: string
) => {
  const league = await League.findById(leagueId);
  if (!league) throw new AppError(404, 'League not found');

  if (league.leagueType !== 'private') return; // public leagues are open to all

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const activePayment = await getActiveSubscriptionPayment(userId);

  if (!activePayment) {
    throw new AppError(
      403,
      'You need an active subscription to join a private league.'
    );
  }

  const planDetails = PLAN_DETAILS[activePayment.subscriptionPlan as SubscriptionPlanType];
  if (!planDetails) {
    throw new AppError(403, 'Invalid subscription plan on record.');
  }

  // null = unlimited, skip the count check
  if (planDetails.maxJoinLeagues === null) return;

  if (user.leaguesJoinedCount >= planDetails.maxJoinLeagues) {
    throw new AppError(
      403,
      `Your ${activePayment.subscriptionPlan} plan allows joining at most ${planDetails.maxJoinLeagues} private leagues per billing period. Please upgrade your plan.`
    );
  }
};

// ─── Increment the user's leaguesJoinedCount after successful join ────────────
export const incrementLeaguesJoined = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { $inc: { leaguesJoinedCount: 1 } });
};

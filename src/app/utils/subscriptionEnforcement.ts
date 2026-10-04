/**
 * Subscription enforcement utilities.
 * Reads the active subscription from the Payment collection
 * (type='subscription', status='success', expiryDate > now).
 */

import AppError from '../error/appError';
import League from '../module/league/league.model';
import { Payment } from '../module/payment/payment.model';
import { RecurringSubscription } from '../module/recurringSubscription/recurringSubscription.model';
import { PLAN_DETAILS, SubscriptionPlanType } from '../module/subscription/subscription.constant';
import User from '../module/user/user.model';

// ─── Get the user's current active subscription payment (legacy fallback) ────
export const getActiveSubscriptionPayment = async (userId: string) => {
  return Payment.findOne({
    userId,
    type: 'subscription',
    status: 'success',
    expiryDate: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

// ─── Get the plan backing the user's current active subscription ─────────────
// RecurringSubscription is the source of truth for the Stripe subscription
// lifecycle — it's what GET /recurring-subscription/status reports too — so
// enforcement is checked against it directly instead of the Payment
// collection, which is only a denormalized mirror written by the confirm/
// webhook flow and can legitimately stay empty (e.g. local dev, where
// Stripe webhooks can't reach a LAN backend) even while a subscription is
// genuinely active.
const getActiveSubscriptionPlan = async (userId: string): Promise<string | undefined> => {
  const recurring = await RecurringSubscription.findOne({
    userId,
    status: { $in: ['trialing', 'active'] },
  }).sort({ createdAt: -1 });
  if (recurring) return recurring.plan;

  // Fall back to the legacy one-off Payment-based subscription record.
  const payment = await getActiveSubscriptionPayment(userId);
  return payment?.subscriptionPlan;
};

// ─── Check whether the user can CREATE a new private league ──────────────────
export const enforceCreateLeagueLimit = async (
  userId: string,
  leagueType: 'public' | 'private'
) => {
  if (leagueType !== 'private') return; // public leagues have no restriction

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const activePlan = await getActiveSubscriptionPlan(userId);

  if (!activePlan) {
    throw new AppError(
      403,
      'You need an active subscription to create a private league.'
    );
  }

  const planDetails = PLAN_DETAILS[activePlan as SubscriptionPlanType];
  if (!planDetails) {
    throw new AppError(403, 'Invalid subscription plan on record.');
  }

  // null = unlimited, skip the count check
  if (planDetails.maxCreateLeagues === null) return;

  if (user.leaguesCreatedCount >= planDetails.maxCreateLeagues) {
    throw new AppError(
      403,
      `Your ${activePlan} plan allows creating at most ${planDetails.maxCreateLeagues} private leagues per billing period. Please upgrade your plan.`
    );
  }
};

// ─── Increment the user's leaguesCreatedCount after successful create ─────────
export const incrementLeaguesCreated = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { $inc: { leaguesCreatedCount: 1 } });
};

// ─── Check whether the user can JOIN a new private league ────────────────────
// ─── Check whether a user can JOIN a private league ───────────────────────
// `subject` distinguishes the message when this is being checked for the
// team's co-player rather than the person submitting the application, so
// the app can tell the user exactly which of the two needs a plan.
export const enforceJoinLeagueLimit = async (
  userId: string,
  leagueId: string,
  subject: 'You' | 'Your co-player' = 'You'
) => {
  const league = await League.findById(leagueId);
  if (!league) throw new AppError(404, 'League not found');

  if (league.leagueType !== 'private') return; // public leagues are open to all

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const activePlan = await getActiveSubscriptionPlan(userId);
  const verb = subject === 'You' ? 'need' : 'needs';

  if (!activePlan) {
    throw new AppError(
      403,
      `${subject} ${verb} an active subscription to join a private league.`
    );
  }

  const planDetails = PLAN_DETAILS[activePlan as SubscriptionPlanType];
  if (!planDetails) {
    throw new AppError(403, 'Invalid subscription plan on record.');
  }

  // null = unlimited, skip the count check
  if (planDetails.maxJoinLeagues === null) return;

  if (user.leaguesJoinedCount >= planDetails.maxJoinLeagues) {
    const possessive = subject === 'You' ? 'Your' : "Your co-player's";
    throw new AppError(
      403,
      `${possessive} ${activePlan} plan allows joining at most ${planDetails.maxJoinLeagues} private leagues per billing period. Please upgrade your plan.`
    );
  }
};

// ─── Increment the user's leaguesJoinedCount after successful join ────────────
export const incrementLeaguesJoined = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { $inc: { leaguesJoinedCount: 1 } });
};

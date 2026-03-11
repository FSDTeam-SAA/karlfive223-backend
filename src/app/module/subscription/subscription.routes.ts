import express from 'express';
import auth from '../../middlewares/Auth';
import {
    activateFreeTrial,
    claimFreeTrialWithOtp,
    expireSubscriptions,
    getAllSubscriptions,
    getMySubscription,
    getPlans,
    getSubscriptionHistory,
} from './subscription.controller';

const router = express.Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/plans', getPlans);

// ─── Authenticated user ────────────────────────────────────────────────────────
// To purchase a subscription, use POST /payment/create-payment with { plan, amount, userId }
// then confirm with POST /payment/confirm-payment

router.get(
  '/my-subscription',
  auth('player', 'manager', 'admin', 'referee'),
  getMySubscription
);

router.get(
  '/history',
  auth('player', 'manager', 'admin', 'referee'),
  getSubscriptionHistory
);

// ─── Claim free trial with event OTP ──────────────────────────────────────────
// New primary method: Users must have an OTP from an approved event
router.post(
  '/claim-free-trial',
  auth('player', 'manager', 'admin', 'referee'),
  claimFreeTrialWithOtp
);

// ─── [DEPRECATED] Activate free trial without OTP ─────────────────────────────
// This endpoint is deprecated and kept only for backward compatibility
router.post(
  '/activate-free-trial',
  auth('player', 'manager', 'admin', 'referee'),
  activateFreeTrial
);

// ─── Admin only ────────────────────────────────────────────────────────────────
router.get('/all', auth('admin'), getAllSubscriptions);
router.post('/expire', auth('admin'), expireSubscriptions);

export const subscriptionRouter = router;

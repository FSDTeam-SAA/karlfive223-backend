import express from 'express';
import auth from '../../middlewares/Auth';
import {
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

/* LEGACY OTP/coupon routes — DISABLED. Do not re-enable without replacing the
 * Stripe trial lifecycle with an equivalent saved-payment-method flow.
router.post('/claim-free-trial', auth('player', 'manager', 'admin', 'referee'), claimFreeTrialWithOtp);
router.post('/activate-free-trial', auth('player', 'manager', 'admin', 'referee'), activateFreeTrial);
*/

// ─── Admin only ────────────────────────────────────────────────────────────────
router.get('/all', auth('admin'), getAllSubscriptions);
router.post('/expire', auth('admin'), expireSubscriptions);

export const subscriptionRouter = router;

import express from 'express';
import auth from '../../middlewares/Auth';
import { userrole } from '../user/user.constent';
import {
    cancelAutoSubscription,
    confirmPayment,
    createCheckoutSession,
    getAllAutoSubscriptions,
    getAutoSubscriptionPlans,
    getAutoSubscriptionStatus,
    getSubscriptionHistory,
} from './autoSubscription.controller';

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ──────────────────────────────────────────────────────────────────────────────

// Get available auto-subscription plans
router.get('/plans', getAutoSubscriptionPlans);

// ──────────────────────────────────────────────────────────────────────────────
// USER ROUTES
// ──────────────────────────────────────────────────────────────────────────────

// Create checkout session - returns Stripe payment link
router.post('/create-checkout', createCheckoutSession);

// Confirm payment after checkout completion
router.post('/confirm-payment', confirmPayment);

// Get current auto-subscription status for a user
router.get('/status/:userId', getAutoSubscriptionStatus);

// Cancel auto-subscription
router.post('/cancel', cancelAutoSubscription);

// Get subscription history for a user
router.get('/history/:userId', getSubscriptionHistory);

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ──────────────────────────────────────────────────────────────────────────────

// Get all auto-subscriptions (admin only)
router.get('/all', auth(userrole.admin), getAllAutoSubscriptions);

export const autoSubscriptionRouter = router;

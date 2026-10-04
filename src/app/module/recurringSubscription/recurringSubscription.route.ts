import express from 'express';
import auth from '../../middlewares/Auth';
import { userrole } from '../user/user.constent';
import {
    cancelSubscriptionHandler,
    confirmRecurringPaymentHandler,
    createRecurringPayment,
    getAllSubscriptions,
    getPlans,
    getRecurringAnalytics,
    getSubscriptionHistory,
    getSubscriptionStatus,
    handleWebhook,
} from './recurringSubscription.controller';

const router = express.Router();

// Webhook route (must be before other routes for raw body parsing)
router.post('/webhook', handleWebhook);

// Public route
router.get('/plans', getPlans);

// User routes
router.post('/create-payment', auth(userrole.player, userrole.manager, userrole.admin, userrole.referee), createRecurringPayment);
router.post('/confirm-payment', auth(userrole.player, userrole.manager, userrole.admin, userrole.referee), confirmRecurringPaymentHandler);
router.get('/status/:userId', auth(userrole.player, userrole.manager, userrole.admin, userrole.referee), getSubscriptionStatus);
router.get('/history/:userId', auth(userrole.player, userrole.manager, userrole.admin, userrole.referee), getSubscriptionHistory);
router.post('/cancel', auth(userrole.player, userrole.manager, userrole.admin, userrole.referee), cancelSubscriptionHandler);

// Admin routes
router.get('/all', auth(userrole.manager), getAllSubscriptions);
router.get('/analytics', auth(userrole.manager), getRecurringAnalytics);

export const recurringSubscriptionRouter = router;

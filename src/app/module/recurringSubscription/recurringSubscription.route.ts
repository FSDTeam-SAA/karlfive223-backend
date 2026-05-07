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
router.post('/create-payment', createRecurringPayment);
router.post('/confirm-payment', confirmRecurringPaymentHandler);
router.get('/status/:userId', getSubscriptionStatus);
router.get('/history/:userId', getSubscriptionHistory);
router.post('/cancel', cancelSubscriptionHandler);

// Admin routes
router.get('/all', auth(userrole.manager), getAllSubscriptions);
router.get('/analytics', auth(userrole.manager), getRecurringAnalytics);

export const recurringSubscriptionRouter = router;

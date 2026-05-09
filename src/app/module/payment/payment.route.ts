import express from 'express'
import auth from '../../middlewares/Auth'
import { userrole } from '../user/user.constent'
import {
    allPayment,
    cancelSubscription,
    checkUserSubscriptionStatus,
    confirmPayment,
    createPayment,
    getManagerPaymentKPI,
    getSubscriptionIncomeCategoryWise,
    getSubscriptionIncomeDayMonth,
    webhookHandler,
} from './payment.controller'


const router = express.Router()

// Create Payment
router.post('/create-payment', createPayment)
router.post('/webhook', webhookHandler)

router.post('/cancel-subscription', auth(userrole.player, userrole.manager), cancelSubscription)

// Confirm Payment
router.post('/confirm-payment', confirmPayment)
router.get('/all-payment', allPayment)

// User: Check subscription status using token
router.get('/check-subscription-status', auth(userrole.player, userrole.manager), checkUserSubscriptionStatus)

// Manager-only analytics (subscription payments only)
router.get('/income/day-month', auth(userrole.manager), getSubscriptionIncomeDayMonth)
router.get('/income/category-wise', auth(userrole.manager), getSubscriptionIncomeCategoryWise)
router.get('/kpi', auth(userrole.manager), getManagerPaymentKPI)

export const paymentRouter = router

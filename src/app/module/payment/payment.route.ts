import express from 'express'
import auth from '../../middlewares/Auth'
import { userrole } from '../user/user.constent'
import {
    allPayment,
    confirmPayment,
    createPayment,
    getManagerPaymentKPI,
    getSubscriptionIncomeCategoryWise,
    getSubscriptionIncomeDayMonth,
} from './payment.controller'


const router = express.Router()

// Create Payment
router.post('/create-payment', createPayment)

// Confirm Payment
router.post('/confirm-payment', confirmPayment)
router.get('/all-payment', allPayment)

// Manager-only analytics (subscription payments only)
router.get('/income/day-month', auth(userrole.manager), getSubscriptionIncomeDayMonth)
router.get('/income/category-wise', auth(userrole.manager), getSubscriptionIncomeCategoryWise)
router.get('/kpi', auth(userrole.manager), getManagerPaymentKPI)

export const paymentRouter = router

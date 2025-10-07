import express from 'express'
import { allPayment, confirmPayment, createPayment } from './payment.controller'


const router = express.Router()

// Create Payment
router.post('/create-payment', createPayment)

// Confirm Payment
router.post('/confirm-payment', confirmPayment)
router.get('/all-payment', allPayment)

export const paymentRouter = router

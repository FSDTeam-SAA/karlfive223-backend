import express from 'express'
import { confirmPayment, createPayment } from './payment.controller'


const router = express.Router()

// Create Payment
router.post('/create-payment', createPayment)

// Confirm Payment
router.post('/confirm-payment', confirmPayment)

export const paymentRouter = router

import { model, Schema } from 'mongoose'
import { IPayment } from './payment.interface'

const paymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  league: { type: Schema.Types.ObjectId, ref: 'League'},
  team: { type: Schema.Types.ObjectId, ref: 'Team'},
  type: { type: String, enum: ['subscription', 'league'] },
  /** Which subscription plan this payment is for */
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'gold', 'club'],
    default: null,
  },
  amount: { type: Number },
  transactionId: { type: String },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  expiryDate: { type: Date }, // For subscriptions - 30 days from activation
},{
  timestamps: true
})

export const Payment = model<IPayment>('Payment', paymentSchema)

import { Schema, model, Types } from 'mongoose'
import { IPayment } from './payment.interface'

const paymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  league: { type: Schema.Types.ObjectId, ref: 'League'},
  team: { type: Schema.Types.ObjectId, ref: 'Team'},
  type: {type: String, enum: ['subscription','league']},
  amount: { type: Number},
  transactionId: { type: String},
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  expiryDate: { type: Date }, // For subscriptions - 31 days from creation
},{
  timestamps: true
})

export const Payment = model<IPayment>('Payment', paymentSchema)

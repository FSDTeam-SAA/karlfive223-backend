import { model, Schema } from 'mongoose'
import { IAutoSubscription } from './autoSubscription.interface'

const autoSubscriptionSchema = new Schema<IAutoSubscription>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan: {
    type: String,
    enum: ['basic', 'gold', 'club'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'trialing', 'active', 'canceled', 'failed', 'suspended'],
    default: 'pending',
  },
  stripeSubscriptionId: { type: String, sparse: true}, // Sparse for pending records
  stripeCustomerId: { type: String, required: true },
  stripePriceId: { type: String, required: true },
  amount: { type: Number, required: true }, // Monthly charge amount in USD
  currency: { type: String, default: 'usd' },
  
  // Billing cycle tracking
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  nextBillingDate: { type: Date },
  
  // Failure tracking
  failureCount: { type: Number, default: 0 },
  lastFailureReason: { type: String },
  lastFailureAt: { type: Date },
  
  // Cancellation info
  canceledAt: { type: Date },
  cancelReason: { type: String },
  
  // Payment method tracking
  paymentMethodId: { type: String },
  last4Digits: { type: String },
  cardBrand: { type: String },
  
  // Metadata
  autoRenewEnabled: { type: Boolean, default: true },
  startDate: { type: Date, default: () => new Date() },
  
}, {
  timestamps: true
})

export const AutoSubscription = model<IAutoSubscription>('AutoSubscription', autoSubscriptionSchema)

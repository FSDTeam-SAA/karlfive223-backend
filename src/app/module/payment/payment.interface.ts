import { Types } from 'mongoose'

export interface IPayment {
  userId: Types.ObjectId
  league: Types.ObjectId
  team: Types.ObjectId
  amount: number
  stripeCustomerId: string
  status: 'pending' | 'success' | 'failed'
  transactionId: string
  type: 'subscription' | 'league'
  /** Which plan was purchased — only populated when type === 'subscription' */
  subscriptionPlan?: 'free' | 'basic' | 'gold' | 'club'
  subscriptionId?: string // For Stripe subscription payments
  subscriptionStatus?: 'pending' | 'active' | 'canceled' | 'past_due' | 'unpaid' | 'past' // For Stripe subscription payments
  expiryDate?: Date
  couponCode?: string
  couponId?: Types.ObjectId
  couponAppliedAt?: Date
  couponRewardDays?: number
  createdAt?: Date
  updatedAt?: Date
}

import { Types } from 'mongoose'
import { SubscriptionPlanType } from '../subscription/subscription.constant'

export interface IAutoSubscription {
  userId: Types.ObjectId
  plan: SubscriptionPlanType | 'basic' | 'gold' | 'club'
  status: 'pending' | 'active' | 'canceled' | 'failed' | 'suspended'
  
  // Stripe identifiers
  stripeSubscriptionId: string
  stripeCustomerId: string
  stripePriceId: string
  
  // Billing info
  amount: number
  currency: string
  
  // Billing cycle
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  nextBillingDate?: Date
  
  // Failure tracking
  failureCount?: number
  lastFailureReason?: string
  lastFailureAt?: Date
  
  // Cancellation
  canceledAt?: Date
  cancelReason?: string
  
  // Payment method
  paymentMethodId?: string
  last4Digits?: string
  cardBrand?: string
  
  // Configuration
  autoRenewEnabled?: boolean
  startDate?: Date
  
  // Timestamps
  createdAt?: Date
  updatedAt?: Date
}

export interface ICreateAutoSubscriptionPayload {
  userId: string
  plan: 'basic' | 'gold' | 'club'
  paymentMethodId?: string // Not used in Checkout flow but kept for compatibility
}

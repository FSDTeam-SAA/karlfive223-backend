import { Document } from 'mongoose';

export interface IRecurringSubscription extends Document {
  userId: string;
  plan: 'basic' | 'gold' | 'club';
  status: 'pending' | 'active' | 'failed' | 'canceled' | 'past_due';
  
  // Stripe IDs
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  stripeSubscriptionId: string;
  
  // Payment details
  amount: number;
  currency: 'usd';
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  
  // Initial payment
  initialPaymentIntentId: string;
  
  // Failure tracking
  failureCount: number;
  lastFailureDate?: Date;
  lastFailureReason?: string;
  
  // Dates
  canceledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateRecurringSubscriptionPayload {
  userId: string;
  plan: 'basic' | 'gold' | 'club';
  amount: number;
}

export interface IConfirmRecurringSubscriptionPayload {
  paymentIntentId: string;
  paymentMethodId: string;
}

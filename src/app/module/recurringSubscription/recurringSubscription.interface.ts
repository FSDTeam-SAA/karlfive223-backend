import { Document } from 'mongoose';

export interface IRecurringSubscription extends Document {
  userId: string;
  plan: 'basic' | 'gold' | 'club';
  status: 'pending' | 'trialing' | 'active' | 'failed' | 'canceled' | 'past_due';
  
  // Stripe IDs
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  stripeSubscriptionId: string;
  
  // Payment details
  amount: number;
  currency: 'usd';
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  
  // Card-collection SetupIntent. It must never charge the first month.
  initialSetupIntentId: string;
  
  // Failure tracking
  failureCount: number;
  lastFailureDate?: Date;
  lastFailureReason?: string;
  
  // Dates
  canceledAt?: Date;
  cancelReason?: string;
  cancelAtPeriodEnd?: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateRecurringSubscriptionPayload {
  userId: string;
  plan: 'basic' | 'gold' | 'club';
  amount: number;
}

export interface IConfirmRecurringSubscriptionPayload {
  userId: string;
  setupIntentId: string;
  paymentMethodId?: string;
}

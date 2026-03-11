import { Types } from 'mongoose';
import { SubscriptionPlanType } from './subscription.constant';

export interface ISubscription {
  userId: Types.ObjectId;
  plan: SubscriptionPlanType;
  price: number;
  maxJoinLeagues: number | null;   // null = unlimited
  maxCreateLeagues: number | null; // null = unlimited
  startDate: Date;
  expiryDate: Date | null;         // null = never expires (not used currently)
  isActive: boolean;
  isFreeTrial: boolean;
  transactionId?: string;          // Stripe PaymentIntent ID (absent for free trial)
}

import { Schema, model } from 'mongoose';
import { IRecurringSubscription } from './recurringSubscription.interface';

const recurringSubscriptionSchema = new Schema<IRecurringSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['basic', 'gold', 'club'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'failed', 'canceled', 'past_due'],
      default: 'pending',
    },
    stripeCustomerId: {
      type: String,
      required: true,
      index: true,
    },
    stripePaymentMethodId: {
      type: String
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    billingPeriodStart: {
      type: Date,
      required: true,
    },
    billingPeriodEnd: {
      type: Date,
      required: true,
    },
    initialPaymentIntentId: {
      type: String,
      required: true,
      index: true,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastFailureDate: {
      type: Date,
    },
    lastFailureReason: {
      type: String,
    },
    canceledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const RecurringSubscription = model<IRecurringSubscription>(
  'RecurringSubscription',
  recurringSubscriptionSchema
);

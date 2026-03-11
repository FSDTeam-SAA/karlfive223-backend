import { Schema, model } from 'mongoose';
import { ISubscription } from './subscription.interface';

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'gold', 'club'],
      required: true,
    },
    price: { type: Number, required: true },
    maxJoinLeagues: { type: Number, default: null },   // null = unlimited
    maxCreateLeagues: { type: Number, default: null }, // null = unlimited
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    isFreeTrial: { type: Boolean, default: false },
    transactionId: { type: String, default: null },
  },
  { timestamps: true }
);

// Index for fast lookup of a user's active subscription
subscriptionSchema.index({ userId: 1, isActive: 1 });

export const Subscription = model<ISubscription>(
  'Subscription',
  subscriptionSchema
);

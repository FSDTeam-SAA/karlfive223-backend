import mongoose, { Schema } from 'mongoose';
import { ICoupon } from './coupon.interface';

const couponSchema = new Schema<ICoupon>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 5,
      maxlength: 5,
    },
    title: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'running', 'expired'],
      default: 'scheduled',
    },
    rewardDays: {
      type: Number,
      default: 30,
    },
    redeemedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ startDate: 1, endDate: 1, status: 1 });

const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);

export default Coupon;

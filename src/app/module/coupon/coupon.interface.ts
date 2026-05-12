import { Document, Types } from 'mongoose';

export interface ICoupon extends Document {
  createdBy: Types.ObjectId;
  code: string;
  title?: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'running' | 'expired';
  rewardDays: number;
  redeemedCount: number;
}

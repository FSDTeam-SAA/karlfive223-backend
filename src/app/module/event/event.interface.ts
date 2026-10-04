import { Document, ObjectId } from "mongoose";

export interface IEvent extends Document {
  /** The club/organizer user who created this event */
  createdBy: ObjectId;
  /** Organization or club name */
  organizationName: string;
  /** Event name/title */
  eventName: string;
  /** Event start date */
  startDate: Date;
  /** Event end date */
  endDate: Date;
  /** Approval status: pending, approved, declined */
  status: "pending" | "approved" | "declined";
  /* Legacy free-subscription OTP fields — disabled.
  otp?: string;
  otpExpiry?: Date;
  otpUsedCount?: number;
  */
  /** Manager who approved/declined the event */
  approvedBy?: ObjectId;
  /** Date when the event was approved/declined */
  approvalDate?: Date;
  /** Reason for declining (optional) */
  declineReason?: string;
}

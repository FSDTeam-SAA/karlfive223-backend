import mongoose, { Schema } from "mongoose";
import { IEvent } from "./event.interface";

const eventSchema = new Schema<IEvent>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    organizationName: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    eventName: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (this: IEvent, value: Date) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "declined"],
      default: "pending",
    },
    /* Legacy free-subscription OTP storage — disabled.
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    otpUsedCount: {
      type: Number,
      default: 0,
    },
    */
    // approvedBy/approvalDate/declineReason are NOT part of the legacy OTP
    // flow — approveEvent()/declineEvent() in event.service.ts still set
    // these on every request, so they must stay active.
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    declineReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
eventSchema.index({ createdBy: 1, status: 1 });
// eventSchema.index({ otp: 1 }); // Legacy free-subscription OTP index — disabled.

const Event = mongoose.model<IEvent>("Event", eventSchema);

export default Event;

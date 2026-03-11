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
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
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
    otpUsedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
eventSchema.index({ createdBy: 1, status: 1 });
eventSchema.index({ otp: 1 });

const Event = mongoose.model<IEvent>("Event", eventSchema);

export default Event;

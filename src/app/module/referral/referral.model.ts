import mongoose from "mongoose";
import { IReferralPerson } from "./referral.interface";

const referralPersonSchema = new mongoose.Schema<IReferralPerson>(
  {
    name: {
      type: String,
      required: [true, "Referral person name is required"],
      trim: true,
      unique: true,
    },
    joinedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const ReferralPerson = mongoose.model<IReferralPerson>(
  "ReferralPerson",
  referralPersonSchema
);

export default ReferralPerson;

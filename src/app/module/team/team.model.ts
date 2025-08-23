import mongoose from "mongoose";
import { ITeam } from "./team.interface";

const Schema = mongoose.Schema;

const teamSchema = new Schema<ITeam>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teamName: {
      type: String,
      required: [true, "Team Name is required."],
      trim: true,
    },
    captainName: {
      type: String,
      required: [true, "Captain Name is required."],
      trim: true,
    },
    partnerName: {
      type: String,
      trim: true,
    },
    playerLevels: {
      type: String,
      required: [true, "Player Levels are required."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      lowercase: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, "Contact Number is required."],
    },
    logoPhotoUrl: {
      type: String,
      default: "",
    },
    league: {
      type: Schema.Types.ObjectId,
      ref: "League",
      required: true,
    },
    agreedToRules: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v: boolean) {
          return v === true;
        },
        message: "You must agree to the League Rules & Code of Conduct.",
      },
    },
    confirmedAvailability: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v: boolean) {
          return v === true;
        },
        message:
          "You must confirm your availability for all scheduled matches.",
      },
    },
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Team = mongoose.model("Team", teamSchema);

export default Team;

import mongoose, { Schema } from "mongoose";
import { IStanding } from "./standing.interface";

const standingSchema = new Schema<IStanding>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    league: {
      type: Schema.Types.ObjectId,
      ref: "League",
      required: true,
    },
    position: { type: Number, required: true },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    drawn: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
    goalDifference: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Standing = mongoose.model<IStanding>("Standing", standingSchema);
export default Standing;

import mongoose, { Schema } from "mongoose";
import { IAmericanoStanding } from "./americanoStanding.interface";

const americanoStandingSchema = new Schema<IAmericanoStanding>(
  {
    league: { type: Schema.Types.ObjectId, ref: "AmericanoLeague", required: true },
    player: { type: Schema.Types.ObjectId, ref: "User", required: true },
    position: { type: Number, default: 0 },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    drawn: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
    goalDifference: { type: Number, default: 0 },
    setsFor: { type: Number, default: 0 },
    setsAgainst: { type: Number, default: 0 },
    setDifference: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AmericanoStanding = mongoose.model<IAmericanoStanding>(
  "AmericanoStanding",
  americanoStandingSchema
);

export default AmericanoStanding;

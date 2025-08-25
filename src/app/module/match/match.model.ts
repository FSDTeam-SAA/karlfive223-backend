import mongoose, { Schema } from "mongoose";
import { IMatch } from "./match.interface";

const matchSchema = new Schema<IMatch>(
  {
    teamOne: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    teamTwo: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    matchDateTime: { type: Date, required: [true, "Match date and time are required."] },
    matchVenue: { type: Schema.Types.ObjectId, ref: "Vanue", required: true },
    league: { type: Schema.Types.ObjectId, ref: "League", required: true },
    matchStatus: {
      type: String,
      enum: ["upcoming", "live", "completed", "postponed"],
      default: "upcoming",
    },
    winnerTeam: { type: Schema.Types.ObjectId, ref: "Team" },
    referee: { type: Schema.Types.ObjectId, ref: "User" },
    matchScore: {
      sets: [
        {
          teamOneGames: { type: Number, required: true },
          teamTwoGames: { type: Number, required: true },
        },
      ],
    },
    // ✅ prevents double-counting if match is edited multiple times
    standingsApplied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Match = mongoose.model<IMatch>("Match", matchSchema);
export default Match;

import mongoose, { Schema } from "mongoose";
import { IMatch } from "./match.interface";

const matchSchema = new Schema<IMatch>(
  {
    teamOne: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    teamTwo: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    matchDateTime: {
      type: Date,
      set: function (val: any) {
        // ✅ Fix timezone issue: treat incoming dates as UTC
        if (typeof val === "string") {
          // If date string doesn't have timezone info, append 'Z' to treat it as UTC
          if (!val.endsWith("Z") && !val.includes("+") && !val.includes("-", 10)) {
            return new Date(val + "Z");
          }
        }
        return val;
      },
    },
    matchVenue: { type: Schema.Types.ObjectId, ref: "Vanue" },
    courtNumber: { type: String, trim: true },
    league: { type: Schema.Types.ObjectId, ref: "League", required: true },
    matchStatus: {
      type: String,
      enum: ["upcoming", "live", "completed", "postponed"],
      default: "upcoming",
    },
    winnerTeam: { type: Schema.Types.ObjectId, ref: "Team", default: null },
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
    // How many times a completed match's score has been corrected — capped
    // at 2 by editCompletedMatchScore.
    scoreEditCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Match = mongoose.model<IMatch>("Match", matchSchema);
export default Match;

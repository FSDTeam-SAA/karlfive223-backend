import mongoose, { Schema } from "mongoose";
import { IAmericanoMatch } from "./americanoMatch.interface";

const americanoMatchSchema = new Schema<IAmericanoMatch>(
  {
    league: { type: Schema.Types.ObjectId, ref: "AmericanoLeague", required: true },
    playerOne: { type: Schema.Types.ObjectId, ref: "User", required: true },
    playerTwo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Set only for pair matches (free one-day Americano): each side is
    // playerOne + playerOnePartner vs playerTwo + playerTwoPartner.
    playerOnePartner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    playerTwoPartner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    roundNumber: { type: Number, default: null },
    matchDateTime: { type: Date },
    matchStatus: {
      type: String,
      enum: ["upcoming", "live", "completed", "postponed"],
      default: "upcoming",
    },
    winnerPlayer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    matchScore: {
      sets: [
        {
          playerOneGames: { type: Number, required: true },
          playerTwoGames: { type: Number, required: true },
        },
      ],
    },
    courtNumber: { type: Number },
    standingsApplied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const AmericanoMatch = mongoose.model<IAmericanoMatch>(
  "AmericanoMatch",
  americanoMatchSchema
);

export default AmericanoMatch;

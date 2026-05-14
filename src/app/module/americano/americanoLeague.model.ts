import mongoose from "mongoose";
import { IAmericanoLeague } from "./americanoLeague.interface";

const americanoLeagueSchema = new mongoose.Schema<IAmericanoLeague>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    leagueName: { type: String, required: true, trim: true },
    joinOtp: { type: String, required: true, index: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    location: { type: String, required: true },
    price: { type: String },
    leagueLogo: { type: String },
    bannerImage: { type: String },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    
    maxPlayers: { type: Number, default: 0 },
    fixturesGenerated: { type: Boolean, default: false },
    matchPlay: {
      type: String,
      enum: ["Once", "Twice", "Thrice"],
      default: "Once",
    },
  },
  { timestamps: true }
);

const AmericanoLeague = mongoose.model<IAmericanoLeague>(
  "AmericanoLeague",
  americanoLeagueSchema
);

export default AmericanoLeague;

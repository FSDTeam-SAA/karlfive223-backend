import mongoose from "mongoose";
import { ILeague } from "./league.interface";

const leagueSchema = new mongoose.Schema<ILeague>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user is requried"],
    },
    leagueName: {
      type: String,
      required: [true, "league name is requried"],
    },
    description: {
      type: String,
      required: [true, "description is requried"],
    },
    leagueLogo: {
      type: String,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    addTeam: {
      type: String,
      //   Team refrence
    },
    type: {
      type: String,
      enum: ["Singles", "Doubles"],
      required: true,
    },
    matchFormat: {
      type: String,
      enum: ["Best of 3 sets", "Best of 5 sets"],
      default: "Best of 3 sets",
    },
    tiebreakOption: {
      type: String,
      enum: ["Standard 7-point", "No tiebreak"],
      default: "Standard 7-point",
    },
    allowSubstitutes: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const League = mongoose.model<ILeague>("League", leagueSchema);
export default League;

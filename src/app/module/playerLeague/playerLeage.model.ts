
import mongoose, { Schema, Document } from "mongoose";
import { IPlayerLeague } from "./playerLeague.interface";


const teamSchema = new Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
});

const leagueSchema = new Schema<IPlayerLeague & Document>(
  {
    leagueName: { type: String, required: true },
    leagueType: { type: String, enum: ["Singles", "Doubles"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String },
    description: { type: String },
    numberOfTeams: { type: Number, required: true },
    teams: { type: [teamSchema], required: true },
    entryFee: { type: Number, default: 0 },
    logo: { type: String, default: null }, // file upload URL
    banner: { type: String, default: null },
    matchFormat: {
      type: String,
      enum: ["Best of 3 sets", "Best of 5 sets"],
      default: "Best of 3 sets",
    },
    tiebreakOption: {
      type: String,
      enum: ["Standard 7-point", "No tiebreak", "Super 10-point"],
      default: "Standard 7-point",
    },
    autoAssignDates: { type: Boolean, default: true },
    allowSubstitutes: { type: Boolean, default: false },
    rules: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const League = mongoose.model<IPlayerLeague & Document>("League", leagueSchema);

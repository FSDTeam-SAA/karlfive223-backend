import { Document, ObjectId } from "mongoose";

export interface ITeam extends Document {
  user: ObjectId;
  player: ObjectId;
  teamName: string;
  captainName: string;
  partnerName: string;
  playerLevels: string;
  email: string;
  contactNumber: string;
  logoPhotoUrl: string;
  league: ObjectId;
  agreedToRules: boolean;
  confirmedAvailability: boolean;
  applicationStatus: "pending" | "approved" | "rejected";
}

import { ObjectId } from "mongoose";

export interface ITeam {
  user: ObjectId;
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

import { ObjectId } from "mongoose";

export interface ILeague {
  user: ObjectId;
  leagueName: string;
  description: string;
  leagueLogo?: string;
  startDate: Date;
  endDate: Date;
  location: string;
  addTeam?: string;
  type: "Singles" | "Doubles";
  matchFormat: "Best of 3 sets" | "Best of 5 sets";
  tiebreakOption: "Standard 7-point" | "No tiebreak";
  allowSubstitutes: boolean;
}

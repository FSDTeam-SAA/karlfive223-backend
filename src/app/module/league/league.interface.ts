import { ObjectId } from "mongoose";

export interface ILeague {
  user: ObjectId;
  leagueName: string;
  description: string;
  leagueLogo?: string;
  bannerImage?: string;
  startDate: Date;
  endDate: Date;
  location: string;
  addTeams?: ObjectId[]; 
  totalGameWeeks: number;  
  type: "Singles" | "Doubles";
  matchFormat: "Best of 3 sets" | "Best of 5 sets";
  tiebreakOption: "Standard 7-point" | "No tiebreak";
  allowSubstitutes: boolean;
}

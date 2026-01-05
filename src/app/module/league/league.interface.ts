import { ObjectId, Types } from "mongoose";

export interface ILeague {
  user: ObjectId;
  leagueName: string;
  leagueCode: string;
  description: string;
  price: string;
  matchPlay: string;
  leagueLogo?: string;
  bannerImage?: string;
  startDate: Date;
  endDate: Date;
  location: string;
  addTeams?: Types.ObjectId[]; 
  totalGameWeeks: number;  
  type: "Singles" | "Doubles";
  leagueType: "public" | "private";
  matchFormat: "Best of 3 sets" | "Best of 5 sets";
  tiebreakOption: "Standard 7-point" | "No tiebreak";
  allowSubstitutes: boolean;
}

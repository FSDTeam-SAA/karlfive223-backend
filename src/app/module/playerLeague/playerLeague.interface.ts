// src/modules/league/league.interface.ts
import { Types } from "mongoose";

export interface ITeam {
  name: string;
  contactNumber: string;
}

export interface IPlayerLeague {
  leagueName: string;
  leagueType: "Singles" | "Doubles";
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  numberOfTeams: number;
  teams: ITeam[];
  entryFee?: number;
  logo?: string;
  banner?: string;
  matchFormat: "Best of 3 sets" | "Best of 5 sets";
  tiebreakOption: "Standard 7-point" | "No tiebreak" | "Super 10-point";
  autoAssignDates: boolean;
  allowSubstitutes: boolean;
  rules?: string;
  createdBy: Types.ObjectId; // reference to User
}

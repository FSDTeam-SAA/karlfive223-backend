import { Document, ObjectId } from "mongoose";

export interface IAmericanoStanding extends Document {
  league: ObjectId;
  player: ObjectId;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  setsFor: number;
  setsAgainst: number;
  setDifference: number;
  points: number;
}

import { Document, ObjectId } from "mongoose";

export interface IStanding extends Document {
  user:ObjectId;
  team: ObjectId;
  league: ObjectId;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

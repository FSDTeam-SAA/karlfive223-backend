import { Document, ObjectId } from "mongoose";

export interface IAmericanoLeague extends Document {
  user: ObjectId;
  leagueName: string;
  joinOtp: string;
  description: string;
  startDate: Date;
  location: string;
  price?: string;
  leagueLogo?: string;
  bannerImage?: string;
  players: ObjectId[];
  maxPlayers?: number;
  fixturesGenerated: boolean;
  matchPlay?: "Once" | "Twice" | "Thrice";
}

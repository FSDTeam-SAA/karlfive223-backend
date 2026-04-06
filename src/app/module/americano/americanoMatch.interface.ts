import { Document, ObjectId } from "mongoose";

export interface IAmericanoMatch extends Document {
  league: ObjectId;
  playerOne: ObjectId;
  playerTwo: ObjectId;
  matchDateTime?: Date;
  matchStatus: "upcoming" | "live" | "completed" | "postponed";
  courtNumber?: number;
  winnerPlayer?: ObjectId | null;
  matchScore?: {
    sets: Array<{
      playerOneGames: number;
      playerTwoGames: number;
    }>;
  };
  standingsApplied: boolean;
}

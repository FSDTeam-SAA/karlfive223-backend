import { Document, ObjectId } from "mongoose";

export interface IAmericanoMatch extends Document {
  league: ObjectId;
  playerOne: ObjectId;
  playerTwo: ObjectId;
  /** Pair matches only: the partners of playerOne / playerTwo. */
  playerOnePartner?: ObjectId | null;
  playerTwoPartner?: ObjectId | null;
  roundNumber?: number | null;
  matchDateTime?: Date;
  matchStatus: "upcoming" | "live" | "completed" | "postponed";
  winnerPlayer?: ObjectId | null;
  courtNumber?: number;
  matchScore?: {
    sets: Array<{
      playerOneGames: number;
      playerTwoGames: number;
    }>;
  };
  standingsApplied: boolean;
}

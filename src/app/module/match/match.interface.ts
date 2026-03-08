import { ObjectId } from "mongoose";

export interface IMatch extends Document {
  teamOne: ObjectId;
  teamTwo: ObjectId;
  matchDateTime: Date; // Combined date and time for easier querying
  matchVenue: ObjectId;
  league: ObjectId;
  matchStatus: "upcoming" | "live" | "completed" | "postponed";
  winnerTeam?: ObjectId | null; // Optional: only for completed matches with a winner, null for draws
  referee?: ObjectId; // Optional: as it might not always be assigned
  matchScore?: {
    // Structured object for scores
    sets: Array<{
      teamOneGames: number;
      teamTwoGames: number;
    }>;
  };
  standingsApplied: boolean;
}

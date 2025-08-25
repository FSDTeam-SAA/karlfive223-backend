import { ObjectId } from "mongoose";

export interface IMatch extends Document {
  teamOne: ObjectId;
  teamTwo: ObjectId;
  matchDateTime: Date; // Combined date and time for easier querying
  matchVenue: ObjectId;
  league: ObjectId;
  matchStatus: "upcoming" | "live" | "completed" | "postponed";
  winnerTeam?: ObjectId; // Optional: only for completed matches
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

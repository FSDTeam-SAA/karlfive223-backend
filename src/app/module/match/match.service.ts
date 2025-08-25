import AppError from "../../error/appError";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import Standing from "../standing/standing.model";
import { updateStandings } from "../standing/standing.service";
import Team from "../team/team.model";
import { IMatch } from "./match.interface";
import Match from "./match.model";


// const POINTS = {
//   WIN: 3,
//   DRAW: 1,
//   LOSS: 0,
// };

// // ✅ Helper function to update standings
// const updateStandings = async (match: IMatch) => {
//   const { teamOne, teamTwo, winnerTeam, league, matchScore } = match;

//   if (!league || !matchScore) return;

//   // Get goals for both teams (sum across sets)
//   const teamOneGoals = matchScore.sets.reduce(
//     (acc, set) => acc + set.teamOneGames,
//     0
//   );
//   const teamTwoGoals = matchScore.sets.reduce(
//     (acc, set) => acc + set.teamTwoGames,
//     0
//   );

//   // Ensure standings exist for both teams
//   const [standingOne, standingTwo] = await Promise.all([
//     Standing.findOneAndUpdate(
//       { team: teamOne, league },
//       { $setOnInsert: { team: teamOne, league } },
//       { upsert: true, new: true }
//     ),
//     Standing.findOneAndUpdate(
//       { team: teamTwo, league },
//       { $setOnInsert: { team: teamTwo, league } },
//       { upsert: true, new: true }
//     ),
//   ]);

//   // Update stats
//   standingOne.played += 1;
//   standingTwo.played += 1;

//   standingOne.goalsFor += teamOneGoals;
//   standingOne.goalsAgainst += teamTwoGoals;

//   standingTwo.goalsFor += teamTwoGoals;
//   standingTwo.goalsAgainst += teamOneGoals;

//   standingOne.goalDifference = standingOne.goalsFor - standingOne.goalsAgainst;
//   standingTwo.goalDifference = standingTwo.goalsFor - standingTwo.goalsAgainst;

//   if (teamOneGoals === teamTwoGoals) {
//     // Draw
//     standingOne.drawn += 1;
//     standingTwo.drawn += 1;
//     standingOne.points += POINTS.DRAW;
//     standingTwo.points += POINTS.DRAW;
//   } else if (winnerTeam?.toString() === teamOne.toString()) {
//     // Team One wins
//     standingOne.won += 1;
//     standingTwo.lost += 1;
//     standingOne.points += POINTS.WIN;
//     standingTwo.points += POINTS.LOSS;
//   } else if (winnerTeam?.toString() === teamTwo.toString()) {
//     // Team Two wins
//     standingTwo.won += 1;
//     standingOne.lost += 1;
//     standingTwo.points += POINTS.WIN;
//     standingOne.points += POINTS.LOSS;
//   }

//   await Promise.all([standingOne.save(), standingTwo.save()]);
// };

// // --- Create Match ---
// const createMatch = async (payload: IMatch) => {
//   if (payload?.teamOne.toString() === payload?.teamTwo.toString()) {
//     throw new AppError(400, "Team One and Team Two cannot be the same.");
//   }

//   const teamOne = await Team.findById(payload.teamOne);
//   const teamTwo = await Team.findById(payload.teamTwo);

//   if (!teamOne || !teamTwo) {
//     throw new AppError(404, "One or both teams not found.");
//   }

//   if (teamOne.league.toString() !== teamTwo.league.toString()) {
//     throw new AppError(400, "Both teams must belong to the same league.");
//   }

//   if (payload.league && payload.league.toString() !== teamOne.league.toString()) {
//     throw new AppError(400, "Match league must be the same as the teams' league.");
//   }

//   const result = await Match.create(payload);

//   // If match already completed, update standings immediately
//   if (result.matchStatus === "completed") {
//     await updateStandings(result);
//   }

//   return result;
// };

// // --- Update Match ---
// const updateMatch = async (id: string, payload: any) => {
//   const match = await Match.findByIdAndUpdate(id, payload, { new: true });

//   if (!match) return null;

//   // Update standings only when completed
//   if (match.matchStatus === "completed" && match.winnerTeam) {
//     await updateStandings(match);
//   }

//   return match.populate("teamOne teamTwo league matchVenue referee winnerTeam");
// };



// const createMatch = async (payload: IMatch) => {
//   // 1. Prevent same team playing against itself
//   if (payload?.teamOne.toString() === payload?.teamTwo.toString()) {
//     throw new AppError(400, "Team One and Team Two cannot be the same.");
//   }

//   // 2. Fetch teams from DB
//   const teamOne = await Team.findById(payload.teamOne);
//   const teamTwo = await Team.findById(payload.teamTwo);

//   if (!teamOne || !teamTwo) {
//     throw new AppError(404, "One or both teams not found.");
//   }

//   // 3. Ensure both teams belong to the same league
//   if (teamOne.league.toString() !== teamTwo.league.toString()) {
//     throw new AppError(400, "Both teams must belong to the same league.");
//   }

//   // 4. (Optional) Ensure match league matches teams' league
//   if (
//     payload.league &&
//     payload.league.toString() !== teamOne.league.toString()
//   ) {
//     throw new AppError(
//       400,
//       "Match league must be the same as the teams' league."
//     );
//   }

//   // 5. Create match
//   const result = await Match.create(payload);
//   return result;
// };

const createMatch = async (payload: IMatch) => {
  if (payload.teamOne === payload.teamTwo) {
    throw new Error("Team One and Team Two cannot be the same");
  }

  const match = await Match.create(payload);

  if (match.matchStatus === "completed") {
    await updateStandings(match);
  }

  return match;
};

const updateMatch = async (id: string, payload: Partial<IMatch>) => {
  const match = await Match.findByIdAndUpdate(id, payload, { new: true });

  if (match && match.matchStatus === "completed") {
    await updateStandings(match);
  }

  return match;
};


const getAllMatches = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];

  // Fields allowed in search
  const searchableFields = ["matchStatus"];

  if (searchTerm) {
    andCondition.push({
      $or: searchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      })),
    });
  }

  // Exact match filters
  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Match.find(whereCondition)
    .populate("teamOne teamTwo league matchVenue referee winnerTeam")
    .sort({ [sortBy]: sortOrder } as any)
    .skip(skip)
    .limit(limit);

  const total = await Match.countDocuments(whereCondition);

  return { data: result, meta: { total, page, limit } };
};

const getSingleMatch = async (id: string) => {
  return Match.findById(id).populate(
    "teamOne teamTwo league matchVenue referee winnerTeam"
  );
};

// const updateMatch = async (id: string, payload: any) => {
//   return Match.findByIdAndUpdate(id, payload, { new: true }).populate(
//     "teamOne teamTwo league matchVenue referee winnerTeam"
//   );
// };

const deleteMatch = async (id: string) => {
  return Match.findByIdAndDelete(id);
};

export default {
  createMatch,
  getAllMatches,
  getSingleMatch,
  updateMatch,
  deleteMatch,
};

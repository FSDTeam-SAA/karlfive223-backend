// import AppError from "../../error/appError";
// import pagenation from "../../helper/pagenation";
// import { IOption } from "../../interface";
// import Standing from "./standing.model";
// import Team from "../team/team.model";
// import { IMatch } from "../match/match.interface";

// const getAllStandings = async (params: any, options: IOption) => {
//   const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
//   const { searchTerm, ...filterData } = params;

//   const andCondition: any[] = [];

//   // Searchable fields
//   const searchableFields = ["position", "points"];

//   if (searchTerm) {
//     andCondition.push({
//       $or: searchableFields.map((field) => ({
//         [field]: { $regex: searchTerm, $options: "i" },
//       })),
//     });
//   }

//   if (Object.keys(filterData).length) {
//     andCondition.push({
//       $and: Object.entries(filterData).map(([field, value]) => ({
//         [field]: value,
//       })),
//     });
//   }

//   const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

//   const result = await Standing.find(whereCondition)
//     .populate("team", "teamName logoPhotoUrl")
//     .populate("league", "leagueName leagueLogo")
//     .populate("user", "name email")
//     .sort({ [sortBy]: sortOrder } as any)
//     .skip(skip)
//     .limit(limit);

//   const total = await Standing.countDocuments(whereCondition);

//   return { data: result, meta: { total, page, limit } };
// };

// const getSingleStanding = async (id: string) => {
//   const result = await Standing.findById(id)
//     .populate("team", "teamName logoPhotoUrl")
//     .populate("league", "leagueName leagueLogo")
//     .populate("user", "name email");

//   if (!result) throw new AppError(404, "Standing not found");
//   return result;
// };

// const createStanding = async (payload: any) => {
//   const team = await Team.findById(payload.team);
//   if (!team) throw new AppError(404, "Team not found");

//   const result = await Standing.create(payload);
//   return result;
// };

// const updateStanding = async (id: string, payload: any) => {
//   const result = await Standing.findByIdAndUpdate(id, payload, { new: true });
//   if (!result) throw new AppError(404, "Standing not found");
//   return result;
// };

// const deleteStanding = async (id: string) => {
//   const result = await Standing.findByIdAndDelete(id);
//   if (!result) throw new AppError(404, "Standing not found");
//   return result;
// };

// // automatic updated

// const POINTS = { WIN: 3, DRAW: 1, LOSS: 0 };

// // Auto-update standings when match completes
// export const updateStandings = async (match: IMatch) => {
//   const { teamOne, teamTwo, winnerTeam, league, matchScore, referee } = match;

//   if (!league || !matchScore) return;

//   // calculate goals
//   const teamOneGoals = matchScore.sets.reduce(
//     (sum, set) => sum + set.teamOneGames,
//     0
//   );
//   const teamTwoGoals = matchScore.sets.reduce(
//     (sum, set) => sum + set.teamTwoGames,
//     0
//   );

//   // ensure standings exist
//   const [standingOne, standingTwo] = await Promise.all([
//     Standing.findOneAndUpdate(
//       { team: teamOne, league },
//       { $setOnInsert: { team: teamOne, league, user: referee } },
//       { upsert: true, new: true }
//     ),
//     Standing.findOneAndUpdate(
//       { team: teamTwo, league },
//       { $setOnInsert: { team: teamTwo, league, user: referee } },
//       { upsert: true, new: true }
//     ),
//   ]);

//   // update stats
//   standingOne.played += 1;
//   standingTwo.played += 1;

//   standingOne.goalsFor += teamOneGoals;
//   standingOne.goalsAgainst += teamTwoGoals;
//   standingTwo.goalsFor += teamTwoGoals;
//   standingTwo.goalsAgainst += teamOneGoals;

//   standingOne.goalDifference = standingOne.goalsFor - standingOne.goalsAgainst;
//   standingTwo.goalDifference = standingTwo.goalsFor - standingTwo.goalsAgainst;

//   if (teamOneGoals === teamTwoGoals) {
//     // draw
//     standingOne.drawn += 1;
//     standingTwo.drawn += 1;
//     standingOne.points += POINTS.DRAW;
//     standingTwo.points += POINTS.DRAW;
//   } else if (winnerTeam?.toString() === teamOne.toString()) {
//     standingOne.won += 1;
//     standingTwo.lost += 1;
//     standingOne.points += POINTS.WIN;
//     standingTwo.points += POINTS.LOSS;
//   } else if (winnerTeam?.toString() === teamTwo.toString()) {
//     standingTwo.won += 1;
//     standingOne.lost += 1;
//     standingTwo.points += POINTS.WIN;
//     standingOne.points += POINTS.LOSS;
//   }

//   await Promise.all([standingOne.save(), standingTwo.save()]);

//   // recalc league positions
//   await recalcPositions(league.toString());
// };

// // sort standings in league
// const recalcPositions = async (leagueId: string) => {
//   const standings = await Standing.find({ league: leagueId }).sort({
//     points: -1,
//     goalDifference: -1,
//     goalsFor: -1,
//   });

//   for (let i = 0; i < standings.length; i++) {
//     standings[i].position = i + 1;
//     await standings[i].save();
//   }
// };

// // get all standings in a league
// export const getStandingsByLeague = async (leagueId: string) => {
//   return Standing.find({ league: leagueId })
//     .populate("team", "name")
//     .sort({ position: 1 });
// };

// export const standingService = {
//   getAllStandings,
//   getSingleStanding,
//   createStanding,
//   updateStanding,
//   deleteStanding,
// };


import Standing from "./standing.model";
import { IMatch } from "../match/match.interface";

const POINTS = { WIN: 3, DRAW: 1, LOSS: 0 };

// --- PUBLIC: list standings for a league (ranked) ---
export const getStandingsByLeague = async (leagueId: string) => {
  return Standing.find({ league: leagueId })
    .populate("team", "teamName logoPhotoUrl")
    .populate("league", "leagueName leagueLogo")
    .sort({ position: 1, points: -1, goalDifference: -1, goalsFor: -1 });
};

// --- INTERNAL: recompute 1..N positions after any change ---
const recalcPositions = async (leagueId: string) => {
  const standings = await Standing.find({ league: leagueId }).sort({
    points: -1,
    goalDifference: -1,
    goalsFor: -1,
  });

  for (let i = 0; i < standings.length; i++) {
    const s = standings[i];
    if (s.position !== i + 1) {
      s.position = i + 1;
      await s.save();
    }
  }
};

// --- PUBLIC: apply a completed match result to both teams' standings ---
export const applyCompletedMatchToStandings = async (match: IMatch) => {
  const { teamOne, teamTwo, winnerTeam, league, matchScore, referee } = match;
  if (!league || !matchScore?.sets?.length) return;

  const t1Goals = matchScore.sets.reduce((a, s) => a + (s.teamOneGames || 0), 0);
  const t2Goals = matchScore.sets.reduce((a, s) => a + (s.teamTwoGames || 0), 0);

  const [s1, s2] = await Promise.all([
    Standing.findOneAndUpdate(
      { team: teamOne, league },
      { $setOnInsert: { team: teamOne, league, user: referee } },
      { new: true, upsert: true }
    ),
    Standing.findOneAndUpdate(
      { team: teamTwo, league },
      { $setOnInsert: { team: teamTwo, league, user: referee } },
      { new: true, upsert: true }
    ),
  ]);

  // played
  s1.played += 1;
  s2.played += 1;

  // goals
  s1.goalsFor += t1Goals;
  s1.goalsAgainst += t2Goals;
  s2.goalsFor += t2Goals;
  s2.goalsAgainst += t1Goals;

  // W/D/L & points
  if (t1Goals === t2Goals) {
    s1.drawn += 1;
    s2.drawn += 1;
    s1.points += POINTS.DRAW;
    s2.points += POINTS.DRAW;
  } else if (winnerTeam && winnerTeam.toString() === teamOne.toString()) {
    s1.won += 1;
    s2.lost += 1;
    s1.points += POINTS.WIN;
  } else {
    s2.won += 1;
    s1.lost += 1;
    s2.points += POINTS.WIN;
  }

  s1.goalDifference = s1.goalsFor - s1.goalsAgainst;
  s2.goalDifference = s2.goalsFor - s2.goalsAgainst;

  await Promise.all([s1.save(), s2.save()]);
  await recalcPositions(league.toString());
};

// --- Optional admin helpers (list, get, update, delete) ---
export const listStandings = async (where: any, sort = { position: 1 }) =>
  Standing.find(where)
    .populate("team", "teamName logoPhotoUrl")
    .populate("league", "leagueName leagueLogo")
    .sort(sort);

export const getStanding = (id: string) =>
  Standing.findById(id)
    .populate("team", "teamName logoPhotoUrl")
    .populate("league", "leagueName leagueLogo");

export const updateStandingManual = (id: string, payload: Partial<typeof Standing>) =>
  Standing.findByIdAndUpdate(id, payload, { new: true });

export const deleteStanding = (id: string) => Standing.findByIdAndDelete(id);

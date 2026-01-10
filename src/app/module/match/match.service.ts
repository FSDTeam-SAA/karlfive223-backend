import AppError from "../../error/appError";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import { applyCompletedMatchToStandings } from "../standing/standing.service";
import Team from "../team/team.model";
import { IMatch } from "./match.interface";
import Match from "./match.model";

// --- Create match ---
const createMatch = async (payload: IMatch) => {
  if (!payload.teamOne || !payload.teamTwo) {
    throw new AppError(400, "Both teams are required.");
  }
  if (payload.teamOne.toString() === payload.teamTwo.toString()) {
    throw new AppError(400, "Team One and Team Two cannot be the same.");
  }

  const [t1, t2] = await Promise.all([
    Team.findById(payload.teamOne),
    Team.findById(payload.teamTwo),
  ]);
  if (!t1 || !t2) throw new AppError(404, "One or both teams not found.");
  if (t1.league.toString() !== t2.league.toString()) {
    throw new AppError(400, "Both teams must belong to the same league.");
  }
  if (payload.league && payload.league.toString() !== t1.league.toString()) {
    throw new AppError(400, "Match league must match the teams' league.");
  }
  payload.league = t1.league; // normalize

  const match = await Match.create(payload);

  if (match.matchStatus === "completed" && !match.standingsApplied) {
    await applyCompletedMatchToStandings(match);
    match.standingsApplied = true;
    await match.save();
  }

  return match.populate("teamOne teamTwo league matchVenue referee winnerTeam");
};

// --- Update match ---
const updateMatch = async (id: string, payload: Partial<IMatch>) => {
  const match = await Match.findById(id);
  if (!match) return null;

  // Keep league/team consistency if any of these fields are being changed
  if (payload.teamOne || payload.teamTwo) {
    const t1 = await Team.findById(payload.teamOne ?? match.teamOne);
    const t2 = await Team.findById(payload.teamTwo ?? match.teamTwo);
    if (!t1 || !t2) throw new AppError(404, "One or both teams not found.");
    if (t1.league.toString() !== t2.league.toString()) {
      throw new AppError(400, "Both teams must belong to the same league.");
    }
    payload.league = t1.league;
  }

  Object.assign(match, payload);
  await match.save();

  // Only apply once
  if (match.matchStatus === "completed") {
    if (!match.winnerTeam && match.matchScore) {
      // If no explicit winner, infer by total games
      const t1Goals = match.matchScore.sets.reduce((a, s) => a + (s.teamOneGames || 0), 0);
      const t2Goals = match.matchScore.sets.reduce((a, s) => a + (s.teamTwoGames || 0), 0);
      if (t1Goals > t2Goals) match.winnerTeam = match.teamOne as any;
      if (t2Goals > t1Goals) match.winnerTeam = match.teamTwo as any;
    }

    await applyCompletedMatchToStandings(match);
    match.standingsApplied = true;
    await match.save();
  }

  return match.populate("teamOne teamTwo league matchVenue referee winnerTeam");
};

// --- Queries ---
const getAllMatches = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];
  const searchable = ["matchStatus"];

  if (searchTerm) {
    andCondition.push({
      $or: searchable.map((f) => ({ [f]: { $regex: searchTerm, $options: "i" } })),
    });
  }
  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([k, v]) => ({ [k]: v })),
    });
  }

  const where = andCondition.length ? { $and: andCondition } : {};

  const data = await Match.find(where)
    .populate("teamOne teamTwo league matchVenue referee winnerTeam")
     .sort({ [sortBy || "createdAt"]: sortOrder || "asc" } as any)
    .skip(skip)
    .limit(limit);

  const total = await Match.countDocuments(where);
  return { data, meta: { total, page, limit } };
};

const getSingleMatch = (id: string) =>
  Match.findById(id).populate("teamOne teamTwo league matchVenue referee winnerTeam");

const deleteMatch = (id: string) => Match.findByIdAndDelete(id);

export default { createMatch, updateMatch, getAllMatches, getSingleMatch, deleteMatch };

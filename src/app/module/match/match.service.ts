import AppError from "../../error/appError";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import Team from "../team/team.model";
import { IMatch } from "./match.interface";
import Match from "./match.model";

const createMatch = async (payload: IMatch) => {
  // 1. Prevent same team playing against itself
  if (payload?.teamOne.toString() === payload?.teamTwo.toString()) {
    throw new AppError(400, "Team One and Team Two cannot be the same.");
  }

  // 2. Fetch teams from DB
  const teamOne = await Team.findById(payload.teamOne);
  const teamTwo = await Team.findById(payload.teamTwo);

  if (!teamOne || !teamTwo) {
    throw new AppError(404, "One or both teams not found.");
  }

  // 3. Ensure both teams belong to the same league
  if (teamOne.league.toString() !== teamTwo.league.toString()) {
    throw new AppError(400, "Both teams must belong to the same league.");
  }

  // 4. (Optional) Ensure match league matches teams' league
  if (
    payload.league &&
    payload.league.toString() !== teamOne.league.toString()
  ) {
    throw new AppError(
      400,
      "Match league must be the same as the teams' league."
    );
  }

  // 5. Create match
  const result = await Match.create(payload);
  return result;
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

const updateMatch = async (id: string, payload: any) => {
  return Match.findByIdAndUpdate(id, payload, { new: true }).populate(
    "teamOne teamTwo league matchVenue referee winnerTeam"
  );
};

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

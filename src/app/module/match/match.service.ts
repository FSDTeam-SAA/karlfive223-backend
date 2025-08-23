import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import Match from "./match.model";

const createMatch = async (payload: any) => {
  return Match.create(payload);
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

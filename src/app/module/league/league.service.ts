import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import Match from "../match/match.model";
import Team from "../team/team.model";
import User from "../user/user.model";
import { ILeague } from "./league.interface";
import League from "./league.model";
import * as crypto from "crypto";


async function generateUniqueLeagueCode() {
  let code;
  let exists: boolean|null = true;

  while (exists) {
    code = crypto.randomBytes(4).toString("hex"); // 6-char code
    exists = await League.findOne({ leagueCode: code });
  }

  return code;
}

const createLeague = async (
  role: string,
  email: string,
  payload: ILeague,
  files: { logo?: Express.Multer.File; banner?: Express.Multer.File }
) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");

  // ✅ Upload Logo
  if (files.logo) {
    const uploadLogo = await fileUploader.uploadToCloudinary(files.logo);
    if (!uploadLogo.secure_url) throw new AppError(400, "Failed to upload logo");
    payload.leagueLogo = uploadLogo.secure_url;
  }

  // ✅ Upload Banner
  if (files.banner) {
    const uploadBanner = await fileUploader.uploadToCloudinary(files.banner);
    if (!uploadBanner.secure_url) throw new AppError(400, "Failed to upload banner");
    payload.bannerImage = uploadBanner.secure_url;
  }

  let leagueType = user.role === "player" ? "private" : "public"
  let leagueCode = crypto.randomBytes(4).toString("hex");

  // Save League
  const league = await League.create({ ...payload, user: user._id, leagueType, leagueCode  });
  if (!league) throw new AppError(400, "Failed to create league");

  return league;
};

const getAllLeagues = async (params: any, options: IOption , userId: any) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, startDate, endDate,leagueType, ...filterData } = params;

  const andCondition: any[] = [];
  const userSearchableFields = ["leagueName", "location", "type", "description"];

  // 🔍 Search filter
  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      })),
    });
  }

  // 📅 Date range filter
  if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) dateFilter.$lte = new Date(endDate as string);

    andCondition.push({ startDate: dateFilter });
  }
if (leagueType === "private") {
  // 1. Find all teams that belong to current user
  const teams = await Team.find({ user: userId }).select("_id");

  // Extract team IDs
  const teamIds = teams.map(team => team._id);

  // 2. Add conditions
  andCondition.push({ leagueType: "private" });
  andCondition.push({ addTeams: { $in: teamIds } }); 
}
if (leagueType === "me") {
  andCondition.push({ user: userId }); 
}

  console.log(andCondition)

  // 🎯 Exact match filters (leagueName, totalGameWeeks, etc.)
  if (Object.keys(filterData).length) {
    const filterConditions: any[] = [];

    for (const [field, value] of Object.entries(filterData)) {
      filterConditions.push({ [field]: value });
    }

    andCondition.push({ $and: filterConditions });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  // ✅ Query DB
  const result = await League.find(whereCondition)
    .populate("addTeams")
    .populate("user", "-isVerified -reset_otpExpiry -reset_otp -otpExpiry -otp")
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 } as any)
    .skip(skip)
    .limit(limit);

  const total = await League.countDocuments(whereCondition);

  return { 
    data: result, 
    meta: { total, page, limit } 
  };
};


const getLeagueById = async (id: string) => {
  const result = await League.findById(id);
  if (!result) throw new AppError(404, "No league found");
  return result;
};

const updateLeague = async (
  id: string,
  payload: Partial<ILeague>,
  files?: { logo?: Express.Multer.File; banner?: Express.Multer.File }
) => {
  const league = await League.findById(id);
  if (!league) throw new AppError(404, "No league found");

  // ✅ Upload new logo if provided
  if (files?.logo) {
    const uploadLogo = await fileUploader.uploadToCloudinary(files.logo);
    if (!uploadLogo.secure_url) throw new AppError(400, "Failed to upload logo");
    payload.leagueLogo = uploadLogo.secure_url;
  }

  // ✅ Upload new banner if provided
  if (files?.banner) {
    const uploadBanner = await fileUploader.uploadToCloudinary(files.banner);
    if (!uploadBanner.secure_url) throw new AppError(400, "Failed to upload banner");
    payload.bannerImage = uploadBanner.secure_url;
  }

  // ✅ Only update provided fields
  Object.keys(payload).forEach((key) => {
    if (payload[key as keyof ILeague] === undefined) {
      delete payload[key as keyof ILeague];
    }
  });

  const result = await League.findByIdAndUpdate(id, payload, { new: true }).populate("addTeams");
  if (!result) throw new AppError(404, "Failed to update league");

  return result;
};

const deleteLeague = async (id: string) => {
  const league = await League.findById(id);
  if (!league) throw new AppError(404, "No league found");

  // Optionally: delete related matches
  await Match.deleteMany({ league: id });

  const result = await League.findByIdAndDelete(id);
  return result;
};


const getPrivateLeague = async (id:string)=>{
  const teams = await Team.find()
}

export const leagueService = {
  createLeague,
  getAllLeagues,
  getLeagueById,
  updateLeague,
  deleteLeague,
};

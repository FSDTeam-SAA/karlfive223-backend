import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import Match from "../match/match.model";
import User from "../user/user.model";
import { ILeague } from "./league.interface";
import League from "./league.model";

// const createLeague = async (
//   email: string,
//   payload: ILeague,
//   file: Express.Multer.File
// ) => {
//   const user = await User.findOne({ email });
//   if (!user) throw new AppError(404, "User not found");

//   if (file) {
//     const uploadLogo = await fileUploader.uploadToCloudinary(file);
//     if (!uploadLogo.secure_url)
//       throw new AppError(400, "Failed to upload logo");
//     payload.leagueLogo = uploadLogo.secure_url;
//   }

//   const result = await League.create({ ...payload, user: user._id });
//   if (!result) throw new AppError(400, "Failed to create league");
//   return result;
// };

const createLeague = async (
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

  // Save League
  const league = await League.create({ ...payload, user: user._id });
  if (!league) throw new AppError(400, "Failed to create league");

  return league;
};

// const getAllLeagues = async (params: any, options: IOption) => {
//   const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
//   const { searchTerm, ...filterData } = params;

//   const andCondition: any[] = [];
//   const userSearchableFields = [
//     "leagueName",
//     "location",
//     "type",
//     "description",
//   ];

//   if (searchTerm) {
//     andCondition.push({
//       $or: userSearchableFields.map((field) => ({
//         [field]: { $regex: searchTerm, $options: "i" },
//       })),
//     });
//   }

//   if (Object.keys(filterData).length) {
//     const filterConditions: any[] = [];

//     for (const [field, value] of Object.entries(filterData)) {
//       if ((field === "startDate" || field === "endDate") && value) {
//         filterConditions.push({ [field]: { $gte: new Date(value as string) } });
//       } else {
//         filterConditions.push({ [field]: value });
//       }
//     }

//     andCondition.push({ $and: filterConditions });
//   }

//   const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

//   const result = await League.find(whereCondition)
//     .sort({ [sortBy]: sortOrder } as any)
//     .skip(skip)
//     .limit(limit);

//   const total = await League.countDocuments(whereCondition);

//   return { data: result, meta: { total, page, limit } };
// };

const getAllLeagues = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, startDate, endDate, ...filterData } = params;

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
    .populate("user", "name email")
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

// const updateLeague = async (
//   id: string,
//   payload: ILeague,
//   file?: Express.Multer.File
// ) => {
//   if (file) {
//     const uploadLogo = await fileUploader.uploadToCloudinary(file);
//     if (!uploadLogo.secure_url)
//       throw new AppError(400, "Failed to upload logo");
//     payload.leagueLogo = uploadLogo.secure_url;
//   }
//   const result = await League.findByIdAndUpdate(id, payload, { new: true });

//   if (!result) throw new AppError(404, "No league found");
//   return result;
// };

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



// const deleteLeague = async (id: string) => {
//   const result = await League.findByIdAndDelete(id);
//   if (!result) throw new AppError(404, "No league found");
//   return result;
// };

export const leagueService = {
  createLeague,
  getAllLeagues,
  getLeagueById,
  updateLeague,
  deleteLeague,
};

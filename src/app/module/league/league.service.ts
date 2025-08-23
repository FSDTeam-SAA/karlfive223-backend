import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import User from "../user/user.model";
import { ILeague } from "./league.interface";
import League from "./league.model";

const createLeague = async (
  email: string,
  payload: ILeague,
  file: Express.Multer.File
) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");

  if (file) {
    const uploadLogo = await fileUploader.uploadToCloudinary(file);
    if (!uploadLogo.secure_url)
      throw new AppError(400, "Failed to upload logo");
    payload.leagueLogo = uploadLogo.secure_url;
  }

  const result = await League.create({ ...payload, user: user._id });
  if (!result) throw new AppError(400, "Failed to create league");
  return result;
};

const getAllLeagues = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];
  const userSearchableFields = [
    "leagueName",
    "location",
    "type",
    "description",
  ];

  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      })),
    });
  }

  if (Object.keys(filterData).length) {
    const filterConditions: any[] = [];

    for (const [field, value] of Object.entries(filterData)) {
      if ((field === "startDate" || field === "endDate") && value) {
        filterConditions.push({ [field]: { $gte: new Date(value as string) } });
      } else {
        filterConditions.push({ [field]: value });
      }
    }

    andCondition.push({ $and: filterConditions });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await League.find(whereCondition)
    .sort({ [sortBy]: sortOrder } as any)
    .skip(skip)
    .limit(limit);

  const total = await League.countDocuments(whereCondition);

  return { data: result, meta: { total, page, limit } };
};

const getLeagueById = async (id: string) => {
  const result = await League.findById(id);
  if (!result) throw new AppError(404, "No league found");
  return result;
};

const updateLeague = async (
  id: string,
  payload: ILeague,
  file?: Express.Multer.File
) => {
  if (file) {
    const uploadLogo = await fileUploader.uploadToCloudinary(file);
    if (!uploadLogo.secure_url)
      throw new AppError(400, "Failed to upload logo");
    payload.leagueLogo = uploadLogo.secure_url;
  }
  const result = await League.findByIdAndUpdate(id, payload, { new: true });

  if (!result) throw new AppError(404, "No league found");
  return result;
};

const deleteLeague = async (id: string) => {
  const result = await League.findByIdAndDelete(id);
  if (!result) throw new AppError(404, "No league found");
  return result;
};

export const leagueService = {
  createLeague,
  getAllLeagues,
  getLeagueById,
  updateLeague,
  deleteLeague,
};

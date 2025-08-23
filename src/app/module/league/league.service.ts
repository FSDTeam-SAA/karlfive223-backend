import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
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

const getAllLeagues = async () => {
  const result = await League.find();
  if (!result) throw new AppError(404, "No leagues found");
  return result;
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

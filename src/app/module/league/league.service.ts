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



export const leagueService = {
  createLeague,
};

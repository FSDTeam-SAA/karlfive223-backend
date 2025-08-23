import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import User from "../user/user.model";
import { ITeam } from "./team.interface";
import Team from "./team.model";

const createTeam = async (
  email: string,
  payload: ITeam,
  file: Express.Multer.File
) => {
  const user = await User.findOne({ email: email });
  if (!user) throw new AppError(404, "User not found");

  if (file) {
    const uploadLogo = await fileUploader.uploadToCloudinary(file);
    if (!uploadLogo?.secure_url)
      throw new AppError(400, "Failed to upload logo");
    payload.logoPhotoUrl = uploadLogo.secure_url;
  }

  const result = await Team.create({ ...payload, user: user._id });
  if (!result) throw new AppError(400, "Failed to create team");
  return result;
};


const getAllTeams = async () => {};
const getSingleTeam = async (id: string) => {};
const updateTeam = async (id: string, payload: Partial<ITeam>) => {};
const deleteTeam = async (id: string) => {};

export const TeamService = {
  createTeam,
  getAllTeams,
  getSingleTeam,
  updateTeam,
  deleteTeam,
};

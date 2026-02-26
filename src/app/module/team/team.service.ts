import mongoose from "mongoose";
import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import League from "../league/league.model";
import { Payment } from "../payment/payment.model";
import User from "../user/user.model";
import { ITeam } from "./team.interface";
import Team from "./team.model";

const createTeam = async (
  email: string,
  payload: any,
  file: Express.Multer.File
) => {
  const user = await User.findOne({ email: email });
  const player = await User.findOne({ email: payload.playerEmail });
  if (!user) throw new AppError(404, "User not found");

  if (!player) throw new AppError(404, "Player not found");

  // Check if co-player has an active subscription
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  const coplayerSubscription = await Payment.findOne({
    userId: player._id,
    type: 'subscription',
    status: "success",
    createdAt: {
      $gte: startOfMonth,
      $lte: endOfMonth,
    },
  });

  if (!coplayerSubscription) {
    throw new AppError(
      402,
      `Co-player ${player.name} must have an active subscription to be added to the team`
    );
  }

  if (file) {
    console.log("File received for team logo:", file.originalname);
    const uploadLogo = await fileUploader.uploadToCloudinary(file);
    if (!uploadLogo?.secure_url)
      throw new AppError(400, "Failed to upload logo");
    payload.logoPhotoUrl = uploadLogo.secure_url;
    console.log(uploadLogo);
  }
  const { league, leagueCode, ...rest } = payload;
  let league2 =
    typeof league === "string" ? new mongoose.Types.ObjectId(league) : league;

  if (!league2) {
    if (leagueCode) {
      const a = await League.findOne({ leagueCode });
      if (a) {
        league2 = a._id;
      }
    }
  }

  // Check if league exists and validate start date
  const leagueDoc = await League.findById(league2);
  if (!leagueDoc) {
    throw new AppError(404, "League not found");
  }

  // Check if league has already started
  const currentDate = new Date();
  const leagueStartDate = new Date(leagueDoc.startDate);
  
  if (leagueStartDate <= currentDate) {
    throw new AppError(
      400,
      "This league has already started. You cannot create a team for this league. Please try to join another one."
    );
  }

  const result = await Team.create({
    ...rest,
    user: user._id,
    player: player._id,
    league: league2,
  });
  if (!result) throw new AppError(400, "Failed to create team");
  const league1 = await League.findByIdAndUpdate(league, {
    $addToSet: { addTeams: result._id },
  });

  return result;
};

const getAllTeams = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];
  const userSearchableFields = [
    "teamName",
    "captainName",
    "partnerName",
    "playerLevels",
    "email",
    "contactNumber",
    "applicationStatus",
  ];

  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      })),
    });
  }

  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};
  const result = await Team.find(whereCondition)
    .sort({ [sortBy]: sortOrder } as any)
    .skip(skip)
    .limit(limit)
    .populate("user", "-isVerified -reset_otpExpiry -reset_otp -otpExpiry -otp")
    .populate("league", "leagueName leagueLogo location");

  const total = await Team.countDocuments(whereCondition);
  return {
    data: result,
    meta: {
      page,
      limit,
      total,
    },
  };
};

const getSingleTeam = async (id: string) => {
  const result = await Team.findById(id)
    .populate("user", "name email role")
    .populate("league", "leagueName leagueLogo location");
  if (!result) throw new AppError(404, "Team not found");
  return result;
};
const updateTeam = async (
  id: string,
  payload: Partial<ITeam>,
  file?: Express.Multer.File
) => {
  if (file) {
    const uploadLogo = await fileUploader.uploadToCloudinary(file);
    if (!uploadLogo?.secure_url)
      throw new AppError(400, "Failed to upload logo");
    payload.logoPhotoUrl = uploadLogo.secure_url;
  }
  const result = await Team.findByIdAndUpdate(id, payload, { new: true });
  if (!result) throw new AppError(404, "Team not found");
  return result;
};
const deleteTeam = async (id: string) => {
  const result = await Team.findByIdAndDelete(id);
  if (!result) throw new AppError(404, "Team not found");
  return result;
};

const updatedStatus = async (idL: string, payload: Partial<ITeam>) => {
  const { applicationStatus } = payload;
  const result = await Team.findByIdAndUpdate(
    idL,
    { applicationStatus },
    { new: true }
  );
  if (!result) throw new AppError(404, "Team not found");
  return result;
};

export const TeamService = {
  createTeam,
  getAllTeams,
  getSingleTeam,
  updateTeam,
  deleteTeam,
  updatedStatus,
};

import mongoose from "mongoose";
import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import {
    enforceJoinLeagueLimit,
    incrementLeaguesJoined,
} from "../../utils/subscriptionEnforcement";
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

  // ─── Subscription enforcement for private leagues ──────────────────────────
  if (leagueDoc.leagueType === "private") {
    // Both the team owner and the co-player need valid subscriptions
    await enforceJoinLeagueLimit(String(user._id), String(league2));
    await enforceJoinLeagueLimit(String(player._id), String(league2));
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

  // ─── Increment join counters for both participants ─────────────────────────
  if (leagueDoc.leagueType === "private") {
    await incrementLeaguesJoined(String(user._id));
    await incrementLeaguesJoined(String(player._id));
  }

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

const changeTeamMember = async (
  teamId: string,
  payload: { memberType: 'user' | 'player'; newMemberEmail: string; },
  requesterEmail: string
) => {
  const { memberType, newMemberEmail } = payload;

  // Validate input
  if (!memberType || !newMemberEmail) {
    throw new AppError(400, "Member type and new member email are required");
  }

  if (memberType !== 'user' && memberType !== 'player') {
    throw new AppError(400, "Member type must be either 'user' or 'player'");
  }

  // Find the team
  const team = await Team.findById(teamId)
    .populate('user', 'name email')
    .populate('player', 'name email')
    .populate('league', 'leagueName');

  if (!team) {
    throw new AppError(404, "Team not found");
  }

  // Check if requester is authorized (must be the team captain/user)
  const requester = await User.findOne({ email: requesterEmail });
  if (!requester) {
    throw new AppError(404, "Requester not found");
  }

  const teamUser: any = team.user;
  const teamPlayer: any = team.player;
  
  if (teamUser._id.toString() !== requester._id.toString()) {
    throw new AppError(403, "Only the team captain can change team members");
  }

  // Find the new member - must be a registered user
  const newMember = await User.findOne({ email: newMemberEmail });
  if (!newMember) {
    throw new AppError(
      404, 
      `User with email ${newMemberEmail} is not registered. The new member must have an account in the system before being added to the team.`
    );
  }

  // Check if new member is already in the team
  if (
    teamUser._id.toString() === newMember._id.toString() ||
    teamPlayer._id.toString() === newMember._id.toString()
  ) {
    throw new AppError(400, "This user is already a member of this team");
  }

  // Check if the new member has an active subscription
  // Using the same logic as createTeam - check for subscription in current month OR valid expiry date
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  const currentDateStart = new Date();
  currentDateStart.setHours(0, 0, 0, 0);

  const activeSubscription = await Payment.findOne({
    userId: newMember._id,
    type: 'subscription',
    status: 'success',
    $or: [
      {
        // Check if subscription was created this month
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      },
      {
        // OR check if subscription has a valid expiry date
        expiryDate: { $gte: currentDateStart },
      },
    ],
  });

  if (!activeSubscription) {
    throw new AppError(
      402,
      `${newMember.name} (${newMemberEmail}) must have an active subscription to be added to the team`
    );
  }

  // Update the team member
  const updateData: any = {};
  updateData[memberType] = newMember._id;

  // Also update related fields if changing the captain (user)
  if (memberType === 'user') {
    updateData.email = newMember.email;
    updateData.captainName = newMember.name;
  } else {
    // If changing player, update partner name
    updateData.partnerName = newMember.name;
  }

  const updatedTeam = await Team.findByIdAndUpdate(
    teamId,
    updateData,
    { new: true }
  )
    .populate('user', 'name email role')
    .populate('player', 'name email role')
    .populate('league', 'leagueName leagueLogo location');

  if (!updatedTeam) {
    throw new AppError(500, "Failed to update team member");
  }

  return {
    team: updatedTeam,
    message: `Successfully changed ${memberType === 'user' ? 'captain' : 'player'} to ${newMember.name}`,
  };
};

const deleteTeamByLeagueCreator = async (
  teamId: string,
  requesterEmail: string
) => {
  // Find the team with league populated
  const team = await Team.findById(teamId).populate('league', 'user leagueName');

  if (!team) {
    throw new AppError(404, "Team not found");
  }

  // Find the requester
  const requester = await User.findOne({ email: requesterEmail });
  if (!requester) {
    throw new AppError(404, "Requester not found");
  }

  // Check if the league exists
  const leagueData: any = team.league;
  if (!leagueData) {
    throw new AppError(404, "League not found for this team");
  }

  // Check if requester is the league creator
  if (leagueData.user.toString() !== requester._id.toString()) {
    throw new AppError(
      403,
      "Only the league creator can delete teams from this league"
    );
  }

  // Remove team from league's addTeams array
  await League.findByIdAndUpdate(
    leagueData._id,
    { $pull: { addTeams: teamId } }
  );

  // Delete the team
  const deletedTeam = await Team.findByIdAndDelete(teamId);

  if (!deletedTeam) {
    throw new AppError(500, "Failed to delete team");
  }

  return deletedTeam;
};

export const TeamService = {
  createTeam,
  getAllTeams,
  getSingleTeam,
  updateTeam,
  deleteTeam,
  updatedStatus,
  changeTeamMember,
  deleteTeamByLeagueCreator,
};

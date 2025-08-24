import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
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
    .populate("user", "name email role")
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


// // team staanding

// const getTeamDetailsById = async (id: string) => {
//   // 1. Fetch Core Team Details
//   // Populate the associated league and the user who created the team
//   const team = await Team.findById(id).populate("league").populate("user", "-password");

//   if (!team) {
//     throw new AppError(404, "Team not found");
//   }

//   const leagueId = team.league._id;

//   // 2. Fetch the Team's Match Schedule
//   // Find all matches where this team is either teamOne or teamTwo
//   const matches = await Match.find({
//     $or: [{ teamOne: id }, { teamTwo: id }],
//     league: leagueId,
//   })
//     .populate("teamOne", "teamName logoPhotoUrl") // Get opponent details
//     .populate("teamTwo", "teamName logoPhotoUrl")
//     .populate("league", "leagueName")
//     .sort({ matchDateTime: "asc" }); // Sort matches chronologically

//   // 3. Calculate League Standings
//   // First, get all teams that are approved for this league
//   const teamsInLeague = await Team.find({
//     league: leagueId,
//     applicationStatus: "approved",
//   });

//   // Then, get all completed matches for point calculation
//   const completedMatches = await Match.find({
//     league: leagueId,
//     matchStatus: "completed",
//   }).populate("winnerTeam");

//   const standingsData: ITeamStanding[] = [];

//   for (const t of teamsInLeague) {
//     let p = 0, w = 0, l = 0, d = 0, gamesFor = 0, gamesAgainst = 0, pts = 0;

//     for (const match of completedMatches) {
//       if (match.teamOne.toString() === t._id.toString() || match.teamTwo.toString() === t._id.toString()) {
//         p++; // Played

//         // Calculate wins and points (assuming 3 for a win)
//         if (match.winnerTeam && match.winnerTeam._id.toString() === t._id.toString()) {
//           w++;
//           pts += 3;
//         } else {
//           l++;
//         }

//         // Calculate +/- from match scores
//         const teamOneTotalGames = match.matchScore.sets.reduce((sum, set) => sum + set.teamOneGames, 0);
//         const teamTwoTotalGames = match.matchScore.sets.reduce((sum, set) => sum + set.teamTwoGames, 0);

//         if (match.teamOne.toString() === t._id.toString()) {
//             gamesFor += teamOneTotalGames;
//             gamesAgainst += teamTwoTotalGames;
//         } else {
//             gamesFor += teamTwoTotalGames;
//             gamesAgainst += teamOneTotalGames;
//         }
//       }
//     }
//     standingsData.push({
//       team: t,
//       pos: 0, // Position will be assigned after sorting
//       p, w, d, l,
//       diff: gamesFor - gamesAgainst,
//       pts,
//     });
//   }

//   // Sort standings by points, then by game difference
//   standingsData.sort((a, b) => {
//     if (b.pts !== a.pts) return b.pts - a.pts;
//     return b.diff - a.diff;
//   });

//   // Assign final position number
//   const finalStandings = standingsData.map((s, index) => ({ ...s, pos: index + 1 }));

//   return {
//     teamDetails: team,
//     matchSchedule: matches,
//     standings: finalStandings,
//   };
// };

export const TeamService = {
  createTeam,
  getAllTeams,
  getSingleTeam,
  updateTeam,
  deleteTeam,
  updatedStatus,
};

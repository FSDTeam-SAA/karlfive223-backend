import { Request, Response } from "express";
import mongoose from "mongoose";
import AppError from "../../error/appError";
import pick from "../../helper/pike";
import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import League from "../league/league.model";
import Match from "./match.model";
import matchService from "./match.service";


export const generateMatchesForLeague = catchAsycn(async (req: Request, res: Response) => {
  const { leagueId } = req.params;

  const league = await League.findById(leagueId).populate("addTeams");
  if (!league) throw new AppError(404, "League not found");

  const existingMatches = await Match.find({ league: league._id });
  if (existingMatches.length > 0) {
    throw new AppError(400, "Matches already created for this league");
  }

  const teams = league.addTeams as mongoose.Types.ObjectId[];
  const matches = [];

  // Use league start date or current date as default
  const defaultMatchDate = league.startDate ? new Date(league.startDate) : new Date();

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        teamOne: teams[i],
        teamTwo: teams[j],
        matchDateTime: defaultMatchDate,
        matchVenue: null,
        league: league._id,
        matchStatus: "upcoming",
      });
    }
  }

  await Match.insertMany(matches);

  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: `Matches generated for league: ${league.leagueName}`,
    data: matches,
  });
});


const createMatch = catchAsycn(async (req: Request, res: Response) => {
  const result = await matchService.createMatch(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Match created successfully",
    data: result,
  });
});

const getAllMatches = catchAsycn(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "matchStatus", "league"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await matchService.getAllMatches(filters, options);

  // ✅ Add winner name or draw status to each completed match
  const enrichedData = result.data.map((match: any) => {
    const matchObj = match.toObject ? match.toObject() : match;
    
    if (matchObj.matchStatus === "completed") {
      const teamOne = matchObj.teamOne;
      const teamTwo = matchObj.teamTwo;
      
      if (matchObj.winnerTeam === null) {
        // It's a draw (winnerTeam is explicitly null)
        matchObj.matchResult = "Draw";
        matchObj.winnerName = "Draw";
      } else if (matchObj.winnerTeam) {
        const winnerTeamId = matchObj.winnerTeam._id ? matchObj.winnerTeam._id.toString() : matchObj.winnerTeam.toString();
        const teamOneId = teamOne._id ? teamOne._id.toString() : teamOne.toString();
        const winnerName = winnerTeamId === teamOneId 
          ? (teamOne.teamName || teamOne) 
          : (teamTwo.teamName || teamTwo);
        
        matchObj.winnerName = winnerName;
        matchObj.matchResult = "Win";
      }
    } else {
      // Match not completed yet - show TBA
      matchObj.winnerName = "TBA";
      matchObj.matchResult = "TBA";
    }
    
    return matchObj;
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message:
      result.data.length === 0
        ? "No matches found"
        : "Matches fetched successfully",
    meta: result.meta,
    data: enrichedData,
  });
});

const getSingleMatch = catchAsycn(async (req: Request, res: Response) => {
  const result = await matchService.getSingleMatch(req.params.id);

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "Match not found",
      data: null,
    });
  }

  // ✅ Add winner name or draw status to response for completed matches
  let responseData: any = result.toObject();
  
  if (result.matchStatus === "completed") {
    const teamOne = result.teamOne as any;
    const teamTwo = result.teamTwo as any;
    
    if (result.winnerTeam === null) {
      // It's a draw (winnerTeam is explicitly null)
      responseData.matchResult = "Draw";
      responseData.winnerName = "Draw";
    } else if (result.winnerTeam) {
      // There's a winner
      const winnerTeamId = result.winnerTeam.toString();
      const winnerName = winnerTeamId === teamOne._id.toString() 
        ? teamOne.teamName 
        : teamTwo.teamName;
      
      responseData.winnerName = winnerName;
      responseData.matchResult = "Win";
    }
  } else {
    // Match not completed yet - show TBA
    responseData.winnerName = "TBA";
    responseData.matchResult = "TBA";
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Match fetched successfully",
    data: responseData,
  });
});

const updateMatch = catchAsycn(async (req: Request, res: Response) => {
  const result = await matchService.updateMatch(req.params.id, req.body);

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "Match not found",
      data: null,
    });
  }

  // ✅ Add winner name or draw status to response for completed matches
  let responseData: any = result.toObject();
  
  if (result.matchStatus === "completed") {
    const teamOne = result.teamOne as any;
    const teamTwo = result.teamTwo as any;
    
    if (result.winnerTeam === null) {
      // It's a draw (winnerTeam is explicitly null)
      responseData.matchResult = "Draw";
      responseData.winnerName = "Draw";
    } else if (result.winnerTeam) {
      // There's a winner
      const winnerTeamId = result.winnerTeam.toString();
      const winnerName = winnerTeamId === teamOne._id.toString() 
        ? teamOne.teamName 
        : teamTwo.teamName;
      
      responseData.winnerName = winnerName;
      responseData.matchResult = "Win";
    }
  } else {
    // Match not completed yet - show TBA
    responseData.winnerName = "TBA";
    responseData.matchResult = "TBA";
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Match updated successfully",
    data: responseData,
  });
});

const deleteMatch = catchAsycn(async (req: Request, res: Response) => {
  const result = await matchService.deleteMatch(req.params.id);

  sendResponse(res, {
    statusCode: result ? 200 : 404,
    success: !!result,
    message: result ? "Match deleted successfully" : "Match not found",
    data: result,
  });
});

const getPlayerNextMatches = catchAsycn(async (req: Request, res: Response) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    throw new AppError(401, "User not authenticated");
  }

  const result = await matchService.getPlayerNextMatches(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.nextMatch
      ? "Player's next match found"
      : "No upcoming matches found for this player",
    data: result,
  });
});

const getTeamFixturesByLeague = catchAsycn(async (req: Request, res: Response) => {
  const { teamId, leagueId } = req.query;

  if (!teamId || !leagueId) {
    throw new AppError(400, "Both teamId and leagueId are required");
  }

  const result = await matchService.getTeamFixturesByLeague(teamId as string, leagueId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.length > 0 
      ? "Team fixtures fetched successfully" 
      : "No fixtures found for this team in the specified league",
    data: result,
  });
});

export default {
  createMatch,
  getAllMatches,
  getSingleMatch,
  updateMatch,
  deleteMatch,
  getPlayerNextMatches,
  getTeamFixturesByLeague,
};

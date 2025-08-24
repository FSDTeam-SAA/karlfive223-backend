import { Request, Response } from "express";
import Standing from "./standing.model";
import catchAsync from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";

const getStandingsByLeague = catchAsync(async (req: Request, res: Response) => {
  const { leagueId } = req.params;

  const standings = await Standing.find({ league: leagueId })
    .populate("team")
    .sort({ points: -1, goalDifference: -1, goalsFor: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Standings fetched successfully",
    data: standings,
  });
});

export const standingController = { getStandingsByLeague };

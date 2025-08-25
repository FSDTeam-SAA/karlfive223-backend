import { Request, Response } from "express";
import catchAsycn from "../../utils/catchAsycn";
import pick from "../../helper/pike";
import sendResponse from "../../utils/sendRespopnse";
import { getStandingsByLeague, standingService } from "./standing.service";

const getAllStandings = catchAsycn(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "league", "team"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await standingService.getAllStandings(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message:
      result.data.length === 0
        ? "No standings found"
        : "Standings fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleStanding = catchAsycn(async (req: Request, res: Response) => {
  const result = await standingService.getSingleStanding(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Standing fetched successfully",
    data: result,
  });
});

const createStanding = catchAsycn(async (req: Request, res: Response) => {
  const result = await standingService.createStanding(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Standing created successfully",
    data: result,
  });
});

const updateStanding = catchAsycn(async (req: Request, res: Response) => {
  const result = await standingService.updateStanding(req.params.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Standing updated successfully",
    data: result,
  });
});

const deleteStanding = catchAsycn(async (req: Request, res: Response) => {
  const result = await standingService.deleteStanding(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Standing deleted successfully",
    data: result,
  });
});

export const getStandings = async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;
    const standings = await getStandingsByLeague(leagueId);
    res.status(200).json({ success: true, data: standings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const standingController = {
  getAllStandings,
  getSingleStanding,
  createStanding,
  updateStanding,
  deleteStanding,
};

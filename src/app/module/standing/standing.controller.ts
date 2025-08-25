import { Request, Response } from "express";
import catchAsycn from "../../utils/catchAsycn";
import pick from "../../helper/pike";
import sendResponse from "../../utils/sendRespopnse";
import {
  getStandingsByLeague,
  listStandings,
  getStanding,
  updateStandingManual,
  deleteStanding,
} from "./standing.service";

export const getLeagueStandings = catchAsycn(async (req: Request, res: Response) => {
  const { leagueId } = req.params;
  const data = await getStandingsByLeague(leagueId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Standings fetched successfully",
    data,
  });
});

// Admin list (filter/sort/paginate if you like)
export const getAllStandings = catchAsycn(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["league", "team"]);
  const data = await listStandings(filters);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Standings fetched successfully",
    data,
  });
});

export const getSingleStanding = catchAsycn(async (req: Request, res: Response) => {
  const data = await getStanding(req.params.id);
  sendResponse(res, {
    statusCode: data ? 200 : 404,
    success: !!data,
    message: data ? "Standing fetched successfully" : "Standing not found",
    data,
  });
});

export const updateStanding = catchAsycn(async (req: Request, res: Response) => {
  const data = await updateStandingManual(req.params.id, req.body);
  sendResponse(res, {
    statusCode: data ? 200 : 404,
    success: !!data,
    message: data ? "Standing updated successfully" : "Standing not found",
    data,
  });
});

export const removeStanding = catchAsycn(async (req: Request, res: Response) => {
  const data = await deleteStanding(req.params.id);
  sendResponse(res, {
    statusCode: data ? 200 : 404,
    success: !!data,
    message: data ? "Standing deleted successfully" : "Standing not found",
    data,
  });
});

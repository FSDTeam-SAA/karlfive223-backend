import { Request, Response } from "express";
import matchService from "./match.service";
import catchAsycn from "../../utils/catchAsycn";
import pick from "../../helper/pike";
import sendResponse from "../../utils/sendRespopnse";

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

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message:
      result.data.length === 0
        ? "No matches found"
        : "Matches fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleMatch = catchAsycn(async (req: Request, res: Response) => {
  const result = await matchService.getSingleMatch(req.params.id);

  sendResponse(res, {
    statusCode: result ? 200 : 404,
    success: !!result,
    message: result ? "Match fetched successfully" : "Match not found",
    data: result,
  });
});

const updateMatch = catchAsycn(async (req: Request, res: Response) => {
  const result = await matchService.updateMatch(req.params.id, req.body);

  sendResponse(res, {
    statusCode: result ? 200 : 404,
    success: !!result,
    message: result ? "Match updated successfully" : "Match not found",
    data: result,
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

export default {
  createMatch,
  getAllMatches,
  getSingleMatch,
  updateMatch,
  deleteMatch,
};

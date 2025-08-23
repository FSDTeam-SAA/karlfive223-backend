import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { leagueService } from "./league.service";

const createLeague = catchAsycn(async (req, res) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    throw new Error("No file uploaded");
  }
  // if frontend sends JSON as string in form-data
  const formData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const result = await leagueService.createLeague(
    req.user?.email,
    formData,
    file
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League created successfully",
    data: result,
  });
});

const getAllLeagues = catchAsycn(async (req, res) => {
  const result = await leagueService.getAllLeagues();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Leagues fetched successfully",
    data: result,
  });
});

const getLeagueById = catchAsycn(async (req, res) => {
  const result = await leagueService.getLeagueById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League fetched successfully",
    data: result,
  });
});

const updateLeague = catchAsycn(async (req, res) => {
  const file = req?.file as Express.Multer.File | undefined;
  const fromData = req.body.data ? JSON.parse(req.body.data) : req.body;
  let result: any;
  if (file) {
    await leagueService.updateLeague(req.params.id, fromData, file);
  } else {
    result = await leagueService.updateLeague(req.params.id, fromData);
  }
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League updated successfully",
    data: result,
  });
});

const deleteLeague = catchAsycn(async (req, res) => {
  const result = await leagueService.deleteLeague(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League deleted successfully",
    data: result,
  });
});

export const leagueController = {
  createLeague,
  getAllLeagues,
  getLeagueById,
  updateLeague,
  deleteLeague,
};

import pick from "../../helper/pike";
import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { TeamService } from "./team.service";

const createTeam = catchAsycn(async (req, res) => {
  const file = req.file as Express.Multer.File;

  const fromData = req.body;

  const result = await TeamService.createTeam(req.user?.email, fromData, file);

  res.status(200).json({
    success: true,
    message: "Team created successfully",
    data: result,
  });
});

const getAllTeams = catchAsycn(async (req, res) => {
  const filters = pick(req.query, [
    "searchTerm",
    "teamName",
    "captainName",
    "partnerName",
    "playerLevels",
    "email",
    "contactNumber",
    "applicationStatus",
  ]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await TeamService.getAllTeams(filters, options);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Teams retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});
const getSingleTeam = catchAsycn(async (req, res) => {
  const id = req.params.id;
  const result = await TeamService.getSingleTeam(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Team retrieved successfully",
    data: result,
  });
});
const updateTeam = catchAsycn(async (req, res) => {
  const id = req.params.id;
  const file = req.file as Express.Multer.File;
  const fromData = req.body;
  const result = await TeamService.updateTeam(id, fromData, file);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Team updated successfully",
    data: result,
  });
});
const deleteTeam = catchAsycn(async (req, res) => {
  const id = req.params.id;
  const result = await TeamService.deleteTeam(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Team deleted successfully",
    data: result,
  });
});

const updatedStatus = catchAsycn(async (req, res) => {
  const id = req.params.id;
  const result = await TeamService.updatedStatus(id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Team status updated successfully",
    data: result,
  });
});

export const teamController = {
  createTeam,
  getAllTeams,
  getSingleTeam,
  updateTeam,
  deleteTeam,
  updatedStatus,
};

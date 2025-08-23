import catchAsycn from "../../utils/catchAsycn";
import { TeamService } from "./team.service";

const createTeam = catchAsycn(async (req, res) => {
  const file = req.file as Express.Multer.File;
  const fromData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const result = await TeamService.createTeam(req.user?.email, fromData, file);
  res.status(200).json({
    success: true,
    message: "Team created successfully",
    data: result,
  });
});
const getAllTeams = catchAsycn(async (req, res) => {});
const getSingleTeam = catchAsycn(async (req, res) => {});
const updateTeam = catchAsycn(async (req, res) => {});
const deleteTeam = catchAsycn(async (req, res) => {});

export const teamController = {
  createTeam,
  getAllTeams,
  getSingleTeam,
  updateTeam,
  deleteTeam,
};

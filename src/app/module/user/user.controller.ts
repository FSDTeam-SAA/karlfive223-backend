import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { userServices } from "./user.service";

const createUser = catchAsycn(async (req, res) => {
  const result = await userServices.createUser(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User created successfully",
    data: result,
  });
});

const getUserByEmail = catchAsycn(async (req, res) => {
  const result = await userServices.getUserByEmail(req.user?.email);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User found successfully",
    data: result,
  });
});

const playingLevel = catchAsycn(async (req, res) => {
  const result = await userServices.playingLevel(req.user?.email, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Level updated successfully",
    data: result,
  });
});

export const userControllers = {
  createUser,
  getUserByEmail,
  playingLevel,
};

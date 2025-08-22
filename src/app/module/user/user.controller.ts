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

const gender = catchAsycn(async (req, res) => {
  const result = await userServices.gender(req.user?.email, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gender updated successfully",
    data: result,
  });
});

const updatedProfile = catchAsycn(async (req, res) => {
  const file = req.file as Express.Multer.File | undefined;

  // if frontend sends JSON as string in form-data
  const formData = req.body.data ? JSON.parse(req.body.data) : req.body;

  const result = await userServices.updatedProfile(
    req.user?.email as string,
    formData,
    file
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

export const userControllers = {
  createUser,
  getUserByEmail,
  playingLevel,
  gender,
  updatedProfile,
};

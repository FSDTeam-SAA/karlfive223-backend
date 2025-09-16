import AppError from "../../error/appError";
import pick from "../../helper/pike";
import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import User from "../user/user.model";
import { adminService } from "./admin.service";

const getAllUsers = catchAsycn(async (req, res) => {
  const filters = pick(req.query, [
    "searchTerm",
    "name",
    "email",
    "role",
    "phoneNumber",
    "playingLevel",
  ]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await adminService.getAllUsers(filters, options);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updatedRoleByUser = catchAsycn(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const result = await adminService.updatedRoleByUser(id, role);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

const deletedUser = catchAsycn(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deletedUser(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

// vanue
const createVanue = catchAsycn(async (req, res) => {
  const result = await adminService.createVanue(req.user?.email, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Venue created successfully",
    data: result,
  });
});

const getAllVanues = catchAsycn(async (req, res) => {
  const result = await adminService.getAllVanues();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

const getSingleVanue = catchAsycn(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.getSingleVanue(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

const deletedVanue = catchAsycn(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deletedVanue(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

const AddManager = catchAsycn(async(req,res)=>{
  const {name, email, password, role = "manager", gender, phoneNumber} = req.body;
   const existingUser = await User.findOne({ email: email });
  if (existingUser) {
    throw new AppError(400, "User already exists");
  }
  const newUser = await User.create({name, email, password, role, gender, phoneNumber, isVerified: true});

  sendResponse(res,{
    statusCode: 200,
    success: true,
    message: "Manager Added Successfully",
    data: newUser
  })
})

export const adminController = {
  getAllUsers,
  updatedRoleByUser,
  createVanue,
  deletedUser,
  getAllVanues,
  deletedVanue,
  getSingleVanue,
  AddManager
};




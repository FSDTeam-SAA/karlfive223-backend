import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import User from "../user/user.model";
import { IReport } from "./report.interface";
import Report from "./report.model";

const createReport = async (
  email: string,
  payload: IReport,
  file?: Express.Multer.File
) => {
  const user = await User.findOne({ email: email });
  if (!user) throw new AppError(404, "User not found");

  if (file) {
    const fileUpload = await fileUploader.uploadToCloudinary(file);
    if (!fileUpload) throw new AppError(500, "Failed to upload file");
    payload.reportImage = fileUpload.secure_url;
  }

  const result = await Report.create({ ...payload, user: user._id });
  if (!result) throw new AppError(500, "Failed to create report");
  return result;
};

const getAllReports = async () => {
  const result = await Report.find().populate("user", "name email role");
  if (!result) throw new AppError(500, "Failed to get reports");
  return result;
};
const getReport = async (id: string) => {
  const result = await Report.findById(id).populate("user", "name email role");
  if (!result) throw new AppError(500, "Failed to get report");
  return result;
};

const updateReport = async (
  id: string,
  payload: IReport,
  file?: Express.Multer.File
) => {
  if (file) {
    const fileUpload = await fileUploader.uploadToCloudinary(file);
    if (!fileUpload) throw new AppError(500, "Failed to upload file");
    payload.reportImage = fileUpload.secure_url;
  }
  const result = await Report.findByIdAndUpdate(id, payload, { new: true });
  if (!result) throw new AppError(500, "Failed to update report");
  return result;
};
const deleteReport = async (id: string) => {
  const result = await Report.findByIdAndDelete(id);
  if (!result) throw new AppError(500, "Failed to delete report");
  return result;
};
export const reportService = {
  createReport,
  getAllReports,
  getReport,
  updateReport,
  deleteReport,
};

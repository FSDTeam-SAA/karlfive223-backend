import catchAsycn from "../../utils/catchAsycn";
import { reportService } from "./report.service";

const createReport = catchAsycn(async (req, res) => {
  const file = req.file as Express.Multer.File;
  const fromData = req.body 
  const result = await reportService.createReport(
    req.user?.email,
    fromData,
    file
  );
  res.send({
    success: true,
    statusCode: 200,
    message: "Report created successfully",
    data: result,
  });
});

const getAllReports = catchAsycn(async (req, res) => {
  const result = await reportService.getAllReports();
  res.send({
    success: true,
    statusCode: 200,
    message: "Reports retrieved successfully",
    data: result,
  });
});
const getReport = catchAsycn(async (req, res) => {
  const result = await reportService.getReport(req.params.id);
  res.send({
    success: true,
    statusCode: 200,
    message: "Report retrieved successfully",
    data: result,
  });
});
const updateReport = catchAsycn(async (req, res) => {
  const file = req.file as Express.Multer.File;
  const fromData = req.body 

  const result = await reportService.updateReport(
    req.params.id,
    fromData,
    file
  );
  res.send({
    success: true,
    statusCode: 200,
    message: "Report updated successfully",
    data: result,
  });
});
const deleteReport = catchAsycn(async (req, res) => {
  const result = await reportService.deleteReport(req.params.id);
  res.send({
    success: true,
    statusCode: 200,
    message: "Report deleted successfully",
    data: result,
  });
});
export const reportController = {
  createReport,
  getAllReports,
  getReport,
  updateReport,
  deleteReport,
};

import pick from "../../helper/pike";
import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
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

export const adminController = {
  getAllUsers,
};

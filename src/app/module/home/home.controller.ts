import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { homeService } from "./home.service";

const search = catchAsycn(async (req, res) => {
  const result = await homeService.search(
    req.user._id,
    String(req.query.q ?? ""),
    Number(req.query.limit)
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Search results fetched successfully",
    data: result,
  });
});

export const homeController = { search };

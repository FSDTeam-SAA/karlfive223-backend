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

export const leagueController = {
  createLeague,
};

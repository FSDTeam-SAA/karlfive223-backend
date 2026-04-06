import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { referralService } from "./referral.service";

const createReferralPerson = catchAsycn(async (req, res) => {
  const result = await referralService.createReferralPerson(req.body.name);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Referral person created successfully",
    data: result,
  });
});

const getReferralNames = catchAsycn(async (_req, res) => {
  const result = await referralService.getReferralNames();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Referral names retrieved successfully",
    data: result,
  });
});

const getReferralSummary = catchAsycn(async (_req, res) => {
  const result = await referralService.getReferralSummary();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Referral summary retrieved successfully",
    data: result,
  });
});

const getReferralDailyStats = catchAsycn(async (req, res) => {
  const result = await referralService.getReferralDailyStats(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Referral statistics retrieved successfully",
    data: result,
  });
});

export const referralController = {
  createReferralPerson,
  getReferralNames,
  getReferralSummary,
  getReferralDailyStats,
};

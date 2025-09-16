import pick from "../../helper/pike";
import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { leagueService } from "./league.service";

const createLeague = catchAsycn(async (req, res) => {
  const formData = req.body ? JSON.parse(req.body) : req.body;

  const files = {
    logo:
      req.files && !Array.isArray(req.files) ? req.files.logo?.[0] : undefined,
    banner:
      req.files && !Array.isArray(req.files)
        ? req.files.banner?.[0]
        : undefined,
  };

  const result = await leagueService.createLeague(
    req.user?.email,
    formData,
    files
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League created successfully",
    data: result,
  });
});

// const getAllLeagues = catchAsycn(async (req, res) => {
//   const filters = pick(req.query, [
//     "searchTerm",
//     "startDate",
//     "endDate",
//     "leagueName",
//     "location",
//     "type",
//   ]);
//   const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
//   const result = await leagueService.getAllLeagues(filters, options);

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Leagues fetched successfully",
//     meta: result.meta,
//     data: result.data,
//   });
// });

const getAllLeagues = catchAsycn(async (req, res) => {
  const filters = pick(req.query, [
    "searchTerm",
    "startDate",
    "endDate",
    "leagueName",
    "location",
    "type",
    "totalGameWeeks",
  ]);

  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await leagueService.getAllLeagues(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Leagues fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getLeagueById = catchAsycn(async (req, res) => {
  const result = await leagueService.getLeagueById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League fetched successfully",
    data: result,
  });
});

const updateLeague = catchAsycn(async (req, res) => {
  const formData = req.body ? JSON.parse(req.body) : req.body;

  const files = {
    logo:
      req.files && !Array.isArray(req.files) ? req.files.logo?.[0] : undefined,
    banner:
      req.files && !Array.isArray(req.files)
        ? req.files.banner?.[0]
        : undefined,
  };

  const result = await leagueService.updateLeague(
    req.params.id,
    formData,
    files
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League updated successfully",
    data: result,
  });
});

const deleteLeague = catchAsycn(async (req, res) => {
  const result = await leagueService.deleteLeague(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League deleted successfully",
    data: result,
  });
});

export const leagueController = {
  createLeague,
  getAllLeagues,
  getLeagueById,
  updateLeague,
  deleteLeague,
};

import { Request, Response } from "express";
import pick from "../../helper/pike";
import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { americanoService } from "./americano.service";

const createAmericanoLeague = catchAsycn(async (req: Request, res: Response) => {
  const formData = req.body;

  const files = {
    logo:
      req.files && !Array.isArray(req.files) ? req.files.logo?.[0] : undefined,
    banner:
      req.files && !Array.isArray(req.files)
        ? req.files.banner?.[0]
        : undefined,
  };

  const result = await americanoService.createLeague(
    req.user?.email,
    formData,
    files
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Americano league created successfully",
    data: result,
  });
});

const joinAmericanoLeague = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.joinLeague(
    req.user?.email,
    req.params.leagueId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Joined Americano league successfully",
    data: result,
  });
});

const joinAmericanoLeagueByOtp = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.joinLeagueByOtp(
    req.user?.email,
    req.body?.otp
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Joined Americano league successfully",
    data: result,
  });
});

const generateAmericanoFixtures = catchAsycn(
  async (req: Request, res: Response) => {
    const currentUserId = req.user?._id || req.user?.id;
    const result = await americanoService.generateFixtures(
      req.params.leagueId,
      currentUserId
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Americano fixtures generated successfully",
      data: result,
    });
  }
);

const getAllAmericanoLeagues = catchAsycn(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "location", "fixturesGenerated"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await americanoService.listLeagues(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano leagues fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyAmericanoLeagues = catchAsycn(async (req: Request, res: Response) => {
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await americanoService.getMyLeagues(req.user?.email, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Your Americano leagues fetched successfully",
    data: {
      pagination: result.meta,
      leagues: result.data,
    },
  });
});

const getAmericanoLeagueById = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.getLeagueById(req.params.leagueId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano league fetched successfully",
    data: result,
  });
});

const getAmericanoFixtures = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.getLeagueFixtures(req.params.leagueId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano fixtures fetched successfully",
    data: result,
  });
});

const getAmericanoMatches = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.getLeagueMatches(req.params.leagueId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano matches fetched successfully",
    data: result,
  });
});

const getAmericanoStandings = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.getLeagueStandings(req.params.leagueId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano standings fetched successfully",
    data: result,
  });
});

const submitAmericanoMatchResult = catchAsycn(
  async (req: Request, res: Response) => {
    const currentUserId = req.user?._id || req.user?.id;
    const result = await americanoService.submitMatchResult(
      req.params.matchId,
      req.body,
      currentUserId
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Americano match result updated successfully",
      data: result,
    });
  }
);
const shareLeagueOtp = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.getShareableOtp(req.params.leagueId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League OTP retrieved successfully",
    data: result,
  });
});

const getLeaguePlayers = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.getLeaguePlayers(req.params.leagueId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League players fetched successfully",
    data: result,
  });
});

const removePlayerFromLeague = catchAsycn(async (req: Request, res: Response) => {
  const currentUserId = req.user?._id || req.user?.id;
  const result = await americanoService.removePlayerFromLeague(
    req.params.leagueId,
    req.params.playerId,
    currentUserId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Player removed from league successfully",
    data: result,
  });
});

const updateAmericanoLeague = catchAsycn(async (req: Request, res: Response) => {
  const formData = req.body;
  const files = {
    logo:
      req.files && !Array.isArray(req.files) ? req.files.logo?.[0] : undefined,
    banner:
      req.files && !Array.isArray(req.files)
        ? req.files.banner?.[0]
        : undefined,
  };
  const currentUserId = req.user?._id || req.user?.id;

  const result = await americanoService.updateLeague(
    req.params.leagueId,
    formData,
    files,
    currentUserId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano league updated successfully",
    data: result,
  });
});

const deleteAmericanoLeague = catchAsycn(async (req: Request, res: Response) => {
  const currentUserId = req.user?._id || req.user?.id;
  await americanoService.deleteLeague(req.params.leagueId, currentUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano league deleted successfully",
    data: null,
  });
});

const getLeagueMatches = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.getLeagueMatches(req.params.leagueId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "League matches fetched successfully",
    data: result,
  });
});

const getAmericanoMatchScore = catchAsycn(async (req: Request, res: Response) => {
  const result = await americanoService.getMatchScore(req.params.matchId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano match score fetched successfully",
    data: result,
  });
});

const editAmericanoMatchScore = catchAsycn(async (req: Request, res: Response) => {
  const currentUserId = req.user?._id || req.user?.id;
  const result = await americanoService.editMatchScore(
    req.params.matchId,
    req.body,
    currentUserId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano match score corrected successfully",
    data: result,
  });
});

const assignCourtNumberToMatch = catchAsycn(async (req: Request, res: Response) => {
  const currentUserId = req.user?._id || req.user?.id;
  const result = await americanoService.assignCourtNumber(
    req.params.matchId,
    req.body.courtNumber,
    currentUserId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Court number assigned successfully",
    data: result,
  });
});

const updateAmericanoMatch = catchAsycn(async (req: Request, res: Response) => {
  const currentUserId = req.user?._id || req.user?.id;
  const result = await americanoService.updateMatch(
    req.params.matchId,
    req.body,
    currentUserId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano match updated successfully",
    data: result,
  });
});

const rescheduleAmericanoMatch = catchAsycn(async (req: Request, res: Response) => {
  const currentUserId = req.user?._id || req.user?.id;
  const result = await americanoService.rescheduleMatch(
    req.params.matchId,
    req.body.matchDateTime,
    currentUserId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Match date updated successfully",
    data: result,
  });
});

const deleteAmericanoMatch = catchAsycn(async (req: Request, res: Response) => {
  const currentUserId = req.user?._id || req.user?.id;
  await americanoService.deleteMatch(req.params.matchId, currentUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Americano match deleted successfully",
    data: null,
  });
});

export const americanoController = {
  createAmericanoLeague,
  joinAmericanoLeague,
  joinAmericanoLeagueByOtp,
  generateAmericanoFixtures,
  getAllAmericanoLeagues,
  getMyAmericanoLeagues,
  getAmericanoLeagueById,
  getAmericanoFixtures,
  getAmericanoMatches,
  getAmericanoStandings,
  submitAmericanoMatchResult,
   shareLeagueOtp,
  getLeaguePlayers,
  removePlayerFromLeague,
  updateAmericanoLeague,
  deleteAmericanoLeague,
  getLeagueMatches,
  getAmericanoMatchScore,
  editAmericanoMatchScore,
  assignCourtNumberToMatch,
  updateAmericanoMatch,
  rescheduleAmericanoMatch,
  deleteAmericanoMatch,
};

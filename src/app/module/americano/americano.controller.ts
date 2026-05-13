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
};

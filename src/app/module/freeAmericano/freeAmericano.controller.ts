import { Request, Response } from "express";
import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { freeAmericanoService } from "./freeAmericano.service";

const currentUserId = (req: Request) => String(req.user?._id || req.user?.id);

const createEvent = catchAsycn(async (req: Request, res: Response) => {
  const result = await freeAmericanoService.createEvent(
    currentUserId(req),
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "One-day Americano created successfully",
    data: result,
  });
});

const getMyEvents = catchAsycn(async (req: Request, res: Response) => {
  const result = await freeAmericanoService.getMyEvents(currentUserId(req));

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "One-day Americanos fetched successfully",
    data: result,
  });
});

const getEventById = catchAsycn(async (req: Request, res: Response) => {
  const result = await freeAmericanoService.getEventById(
    req.params.eventId,
    currentUserId(req)
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "One-day Americano fetched successfully",
    data: result,
  });
});

const getEventMatches = catchAsycn(async (req: Request, res: Response) => {
  const result = await freeAmericanoService.getEventMatches(
    req.params.eventId,
    currentUserId(req)
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "One-day Americano matches fetched successfully",
    data: result,
  });
});

const getEventStandings = catchAsycn(async (req: Request, res: Response) => {
  const result = await freeAmericanoService.getEventStandings(
    req.params.eventId,
    currentUserId(req)
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "One-day Americano standings fetched successfully",
    data: result,
  });
});

const submitMatchResult = catchAsycn(async (req: Request, res: Response) => {
  const result = await freeAmericanoService.submitMatchResult(
    req.params.matchId,
    req.body,
    currentUserId(req)
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Match result saved successfully",
    data: result,
  });
});

const assignCourtNumber = catchAsycn(async (req: Request, res: Response) => {
  const result = await freeAmericanoService.assignCourtNumber(
    req.params.matchId,
    req.body?.courtNumber,
    currentUserId(req)
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Court number assigned successfully",
    data: result,
  });
});

const deleteEvent = catchAsycn(async (req: Request, res: Response) => {
  await freeAmericanoService.deleteEvent(
    req.params.eventId,
    currentUserId(req)
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "One-day Americano deleted successfully",
    data: null,
  });
});

export const freeAmericanoController = {
  createEvent,
  getMyEvents,
  getEventById,
  getEventMatches,
  getEventStandings,
  submitMatchResult,
  assignCourtNumber,
  deleteEvent,
};

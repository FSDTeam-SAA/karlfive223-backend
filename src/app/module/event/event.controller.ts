import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { eventService } from "./event.service";

// ─── Create Event ─────────────────────────────────────────────────────────────
export const createEvent = catchAsycn(async (req, res) => {
  const { organizationName, eventName, startDate, endDate } = req.body;

  const result = await eventService.createEvent(req.user?.email, {
    organizationName,
    eventName,
    startDate,
    endDate,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Event created successfully. Pending manager approval.",
    data: result,
  });
});

// ─── Get My Events ────────────────────────────────────────────────────────────
export const getMyEvents = catchAsycn(async (req, res) => {
  const result = await eventService.getMyEvents(req.user?.email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Events retrieved successfully",
    data: result,
  });
});

// ─── Get All Events (Manager/Admin) ───────────────────────────────────────────
export const getAllEvents = catchAsycn(async (req, res) => {
  const { status, searchTerm } = req.query;

  const result = await eventService.getAllEvents({
    status: status as string,
    searchTerm: searchTerm as string,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Events retrieved successfully",
    data: result,
  });
});

// ─── Get Single Event ─────────────────────────────────────────────────────────
export const getSingleEvent = catchAsycn(async (req, res) => {
  const { id } = req.params;

  const result = await eventService.getSingleEvent(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Event retrieved successfully",
    data: result,
  });
});

// ─── Approve Event ────────────────────────────────────────────────────────────
export const approveEvent = catchAsycn(async (req, res) => {
  const { id } = req.params;

  const result = await eventService.approveEvent(id, req.user?.email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Event approved successfully. OTP generated.",
    data: result,
  });
});

// ─── Decline Event ────────────────────────────────────────────────────────────
export const declineEvent = catchAsycn(async (req, res) => {
  const { id } = req.params;
  const { declineReason } = req.body;

  const result = await eventService.declineEvent(
    id,
    req.user?.email,
    declineReason
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Event declined successfully",
    data: result,
  });
});

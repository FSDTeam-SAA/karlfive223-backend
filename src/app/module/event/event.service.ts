import AppError from "../../error/appError";
import { createAndSendNotifications } from "../../helper/socketHelper";
import User from "../user/user.model";
import { EVENT_OTP_CONFIG, EVENT_STATUS } from "./event.constant";
import Event from "./event.model";

// ─── Create Event (Club Users Only) ──────────────────────────────────────────
const createEvent = async (
  userEmail: string,
  payload: {
    organizationName: string;
    eventName: string;
    startDate: Date;
    endDate: Date;
  }
) => {
  // Find user and verify they have club subscription (isOrganizer = true)
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (!user.isOrganizer) {
    throw new AppError(
      403,
      "Only club subscription holders can create events"
    );
  }

  // Validate dates
  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);

  if (startDate < new Date()) {
    throw new AppError(400, "Start date cannot be in the past");
  }

  if (endDate <= startDate) {
    throw new AppError(400, "End date must be after start date");
  }

  // Create event
  const event = await Event.create({
    createdBy: user._id,
    organizationName: payload.organizationName,
    eventName: payload.eventName,
    startDate,
    endDate,
    status: EVENT_STATUS.PENDING,
  });

  await event.populate("createdBy", "name email");

  // Send notification to all managers about new event request
  const managers = await User.find({ role: "manager" }).select("_id");
  const managerIds = managers.map((m) => m._id);

  if (managerIds.length > 0) {
    await createAndSendNotifications(
      managerIds,
      "New Event Request",
      `📋 ${user.name} from ${payload.organizationName} has submitted a new event: "${payload.eventName}" for approval.`,
      "event"
    );
  }

  return event;
};

// ─── Get My Events (for club users) ──────────────────────────────────────────
const getMyEvents = async (userEmail: string) => {
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const events = await Event.find({ createdBy: user._id })
    .populate("createdBy", "name email")
    .populate("approvedBy", "name email")
    .sort({ createdAt: -1 });

  return events;
};

// ─── Get All Events (Manager/Admin) ──────────────────────────────────────────
const getAllEvents = async (filters?: {
  status?: string;
  searchTerm?: string;
}) => {
  const query: any = {};

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.searchTerm) {
    query.$or = [
      { organizationName: { $regex: filters.searchTerm, $options: "i" } },
      { eventName: { $regex: filters.searchTerm, $options: "i" } },
    ];
  }

  const events = await Event.find(query)
    .populate("createdBy", "name email phoneNumber")
    .populate("approvedBy", "name email")
    .sort({ createdAt: -1 });

  return events;
};

// ─── Get Single Event ────────────────────────────────────────────────────────
const getSingleEvent = async (eventId: string) => {
  const event = await Event.findById(eventId)
    .populate("createdBy", "name email phoneNumber")
    .populate("approvedBy", "name email");

  if (!event) {
    throw new AppError(404, "Event not found");
  }

  return event;
};

// ─── Approve Event (Manager Only) ────────────────────────────────────────────
const approveEvent = async (eventId: string, managerEmail: string) => {
  const manager = await User.findOne({ email: managerEmail });
  if (!manager) {
    throw new AppError(404, "Manager not found");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError(404, "Event not found");
  }

  if (event.status !== EVENT_STATUS.PENDING) {
    throw new AppError(400, `Event is already ${event.status}`);
  }

  // Generate OTP and set expiry to event end date
  const otp = EVENT_OTP_CONFIG.generateOtp();
  
  // OTP is valid until the event ends
  const otpExpiry = new Date(event.endDate);

  // Update event
  event.status = EVENT_STATUS.APPROVED;
  event.otp = otp;
  event.otpExpiry = otpExpiry;
  event.approvedBy = manager._id as any;
  event.approvalDate = new Date();

  await event.save();
  await event.populate("createdBy", "name email phoneNumber");
  await event.populate("approvedBy", "name email");

  // Send notification to event creator about approval
  const creator = event.createdBy as any;
  if (creator && creator._id) {
    await createAndSendNotifications(
      [creator._id],
      "Event Approved! 🎉",
      `✅ Your event "${event.eventName}" has been approved! OTP: ${otp}. Valid until ${event.endDate.toLocaleDateString()}. Share this OTP with participants to claim free trials.`,
      "success"
    );
  }

  return event;
};

// ─── Decline Event (Manager Only) ────────────────────────────────────────────
const declineEvent = async (
  eventId: string,
  managerEmail: string,
  declineReason?: string
) => {
  const manager = await User.findOne({ email: managerEmail });
  if (!manager) {
    throw new AppError(404, "Manager not found");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError(404, "Event not found");
  }

  if (event.status !== EVENT_STATUS.PENDING) {
    throw new AppError(400, `Event is already ${event.status}`);
  }

  // Update event
  event.status = EVENT_STATUS.DECLINED;
  event.approvedBy = manager._id as any;
  event.approvalDate = new Date();
  if (declineReason) {
    event.declineReason = declineReason;
  }

  await event.save();
  await event.populate("createdBy", "name email phoneNumber");
  await event.populate("approvedBy", "name email");

  // Send notification to event creator about decline
  const creator = event.createdBy as any;
  if (creator && creator._id) {
    const reasonText = declineReason ? ` Reason: ${declineReason}` : "";
    await createAndSendNotifications(
      [creator._id],
      "Event Declined",
      `❌ Your event "${event.eventName}" has been declined.${reasonText}`,
      "warning"
    );
  }

  return event;
};

// ─── Validate Event OTP ──────────────────────────────────────────────────────
const validateEventOtp = async (otp: string) => {
  const event = await Event.findOne({ otp, status: EVENT_STATUS.APPROVED });

  if (!event) {
    throw new AppError(404, "Invalid OTP");
  }

  if (!event.otpExpiry || event.otpExpiry < new Date()) {
    throw new AppError(400, "OTP has expired");
  }

  return event;
};

// ─── Increment OTP Usage Count ───────────────────────────────────────────────
const incrementOtpUsage = async (eventId: string) => {
  await Event.findByIdAndUpdate(eventId, {
    $inc: { otpUsedCount: 1 },
  });
};

export const eventService = {
  createEvent,
  getMyEvents,
  getAllEvents,
  getSingleEvent,
  approveEvent,
  declineEvent,
  validateEventOtp,
  incrementOtpUsage,
};

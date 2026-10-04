import catchAsycn from "../../utils/catchAsycn";
import AppError from "../../error/appError";
import sendResponse from "../../utils/sendRespopnse";
import { FCM } from "./fcm.model";

/**
 * Register (or re-register) this device's FCM token against the logged-in
 * user. Matched on fcmToken alone, not {user, fcmToken}: a device token
 * moving to a different logged-in user (log out, log in as someone else on
 * the same phone) must be reassigned in place, not duplicated — otherwise
 * the previous owner would keep getting pushes meant for this device.
 *
 * `user` is taken from the auth token (req.user), never trusted from the
 * request body — the old implementation let any authenticated caller
 * register a token against an arbitrary user id.
 */
export const registerFcmToken = catchAsycn(async (req, res) => {
  const { fcmToken } = req.body;
  const userId = req.user?._id;

  if (!fcmToken || typeof fcmToken !== "string") {
    throw new AppError(400, "fcmToken is required");
  }
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  const fcm = await FCM.findOneAndUpdate(
    { fcmToken },
    { user: userId, fcmToken },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Device registered for push notifications",
    data: fcm,
  });
});

/**
 * Removes this device's token so a logged-out device stops receiving
 * pushes meant for the account it just left. Called by the client before
 * clearing its local auth state, while the access token is still valid.
 */
export const unregisterFcmToken = catchAsycn(async (req, res) => {
  const { fcmToken } = req.body;
  const userId = req.user?._id;

  if (!fcmToken || typeof fcmToken !== "string") {
    throw new AppError(400, "fcmToken is required");
  }

  await FCM.deleteOne({ user: userId, fcmToken });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Device unregistered from push notifications",
    data: null,
  });
});

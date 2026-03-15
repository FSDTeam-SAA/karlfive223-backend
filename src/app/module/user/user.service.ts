import { Secret } from "jsonwebtoken";
import config from "../../config";
import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import { jwtHelper } from "../../helper/jwtHelper";
import { PLAN_DETAILS } from "../subscription/subscription.constant";
import { subscriptionService } from "../subscription/subscription.service";
import { IUser } from "./user.interface";
import User from "./user.model";

const createUser = async (payload: Partial<IUser>) => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new AppError(400, "User already exists");
  }
  const newUser = await User.create(payload);

  if (!newUser) {
    throw new AppError(400, "User creation failed");
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  newUser.otp = otp;
  newUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  newUser.isVerified = true;
  await newUser.save();

  // // ─── Auto-assign 24-hour free trial ──────────────────────────────────────
  // // The free trial is automatically granted on registration (one-time only)
  // // Users can also manually activate via POST /subscription/activate-free-trial
  // await subscriptionService.assignFreeTrial(String(newUser._id));

  const accessToken = jwtHelper.generateToken(
    { email: newUser.email, role: newUser.role },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in
  );

  const refreshToken = jwtHelper.generateToken(
    { email: newUser.email, role: newUser.role },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in
  );
  newUser.refreshToken = refreshToken;
  await newUser.save();


  // await sendMailer(
  //   newUser.email,
  //   "Welcome to our platform",
  //   `Hello ${newUser.name}, welcome to our platform.`
  // );
  // newUser.isVerified = true;
  // await newUser.save();

  // Remove password before returning
  const { password: _, ...result } = newUser.toObject();

  return { result, accessToken, refreshToken };
};

const getUserByEmail = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  // Fetch the active subscription payment record
  const activeSubscription = await subscriptionService.getMySubscription(String(user._id));

  const user1 = user.toObject() as any;
  
  // Build detailed subscription info for the response
  if (activeSubscription) {
    const planDetails = activeSubscription.subscriptionPlan 
      ? PLAN_DETAILS[activeSubscription.subscriptionPlan as keyof typeof PLAN_DETAILS]
      : null;

    user1.subscription = {
      plan: activeSubscription.subscriptionPlan ?? null,
      planName: planDetails?.name ?? 'Unknown Plan',
      price: activeSubscription.amount ?? 0,
      purchaseDate: activeSubscription.createdAt ?? null,
      expiryDate: activeSubscription.expiryDate ?? null,
      isActive: activeSubscription.expiryDate 
        ? new Date(activeSubscription.expiryDate) > new Date()
        : false,
      maxJoinLeagues: planDetails?.maxJoinLeagues ?? 0,
      maxCreateLeagues: planDetails?.maxCreateLeagues ?? 0,
    };
  } else {
    user1.subscription = null;
  }

  return user1;
};
const getUserById = async (email: string) => {
  const user = await User.findById(email).select("-isVerified -reset_otpExpiry -reset_otp -otpExpiry -otp");
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

const playingLevel = async (email: string, payload: Partial<IUser>) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const { playingLevel } = payload;
  const updatedPlayingLevel = await User.findByIdAndUpdate(
    user.id,
    { playingLevel },
    { new: true }
  );
  return updatedPlayingLevel;
};

const gender = async (email: string, payload: Partial<IUser>) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const { gender } = payload;
  const updatedGender = await User.findByIdAndUpdate(
    user.id,
    { gender },
    { new: true }
  );
  return updatedGender;
};

const updatedProfile = async (
  userEmail: string,
  payload: Partial<IUser>,
  file?: Express.Multer.File
) => {
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  // Handle image upload if file is provided
  if (file) {
    const uploadedImage = await fileUploader.uploadToCloudinary(file);
    payload.profileImage = uploadedImage.secure_url;
  }
  // Update allowed fields
  const updatedUser = await User.findByIdAndUpdate(user._id, payload, {
    new: true,
  }).select("-password"); // don't return password

  return updatedUser;
};
const deleteUser = async (id: string) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;;
};

export const userServices = {
  createUser,
  getUserByEmail,
  playingLevel,
  gender,
  updatedProfile,
  getUserById,
  deleteUser,
};

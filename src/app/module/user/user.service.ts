import { Secret } from "jsonwebtoken";
import config from "../../config";
import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import { jwtHelper } from "../../helper/jwtHelper";
import { sendMailer } from "../../helper/sendMailer";
import createOtpTemplate from "../../utils/createOtpTemplate";
import { IUser } from "./user.interface";
import User from "./user.model";
import { Payment } from "../payment/payment.model";

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
  newUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 5 mins
  newUser.isVerified = true;
  await newUser.save();

  await sendMailer({
    to: newUser.email,
    subject: "Verify Your Mail",
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`, // fallback for non-HTML clients
    html: createOtpTemplate(otp, newUser.email, "Pixel Central"),
  });

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
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  const paymentThisMonth = await Payment.findOne({
    userId: user._id,
    type: 'subscription',
    status: "success",
    createdAt: {
      $gte: startOfMonth,
      $lte: endOfMonth,
    },
  });

  const user1 = user.toObject() as any ;
  user1.subscription = paymentThisMonth ? true : false
  
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

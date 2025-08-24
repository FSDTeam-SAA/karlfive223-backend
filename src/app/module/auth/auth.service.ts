import bcrypt from "bcryptjs";
import User from "../user/user.model";
import AppError from "../../error/appError";
import { jwtHelper } from "../../helper/jwtHelper";
import config from "../../config";
import { Secret } from "jsonwebtoken";
import { sendMailer } from "../../helper/sendMailer";

const loginUser = async (payload: { email: string; password: string }) => {
  const { email, password } = payload;

  const user = await User.findOne({ email });
  if (!user) throw new AppError(400, "User not found");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError(400, "Incorrect password");

  const accessToken = jwtHelper.generateToken(
    { email: user.email, role: user.role },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in
  );

  const refreshToken = jwtHelper.generateToken(
    { email: user.email, role: user.role },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in
  );

  await User.findByIdAndUpdate(
    user._id,
    { $set: { refreshToken } },
    { new: true }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const refreshToken = async (token: string) => {
  let verifiedToken;
  try {
    verifiedToken = jwtHelper.verifyToken(
      token,
      config.jwt.refresh_secret as Secret
    );
  } catch {
    throw new AppError(403, "Invalid Refresh Token");
  }

  const { email } = verifiedToken;
  const user = await User.findOne({ email });
  if (!user || user.refreshToken !== token) {
    throw new AppError(403, "Refresh token not valid or expired");
  }
  
  const newAccessToken = jwtHelper.generateToken(
    { email: user.email, role: user.role },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in
  );

  return { accessToken: newAccessToken };
};

const sendResetOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(400, "User not found");
  //   if (!user.isVerified) throw new AppError(400, "User not verified");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();

  await sendMailer(user.email, "OTP for reset password", otp);
  return { message: "OTP sent to your email" };
};

const verifyOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(400, "User not found");
  //   if (!user.isVerified) throw new AppError(400, "User not verified");

  if (user.otp !== otp) throw new AppError(400, "Invalid OTP");
  if (user.otpExpiry && user.otpExpiry < new Date())
    throw new AppError(400, "OTP expired");

  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  return { message: "OTP verified" };
};

const resetPassword = async (email: string, newPassword: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(400, "User not found");

  console.log(email, newPassword);
  //   if (!user.isVerified) throw new AppError(400, "User not verified");

  user.password = newPassword;
  await user.save();

  return { message: "Password reset successfully" };
};

export const authService = {
  loginUser,
  refreshToken,
  sendResetOtp,
  verifyOtp,
  resetPassword,
};

// import bcrypt from "bcryptjs";
// import User from "../user/user.model";
// import AppError from "../../error/appError";
// import { jwtHelper } from "../../helper/jwtHelper";
// import config from "../../config";
// import { Secret } from "jsonwebtoken";
// import { sendMailer } from "../../helper/sendMailer";
// import createOtpTemplate from "../../utils/createOtpTemplate";

// const loginUser = async (payload: { email: string; password: string }) => {
//   const { email, password } = payload;

//   const user = await User.findOne({ email });
//   if (!user) throw new AppError(400, "User not found");

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch) throw new AppError(400, "Incorrect password");

//   const accessToken = jwtHelper.generateToken(
//     { email: user.email, role: user.role },
//     config.jwt.access_secret as Secret,
//     config.jwt.access_expires_in
//   );

//   const refreshToken = jwtHelper.generateToken(
//     { email: user.email, role: user.role },
//     config.jwt.refresh_secret as Secret,
//     config.jwt.refresh_expires_in
//   );

//   await User.findByIdAndUpdate(
//     user._id,
//     { $set: { refreshToken } },
//     { new: true }
//   );

//   return {
//     accessToken,
//     refreshToken,
//     user: {
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//     },
//   };
// };

// const refreshToken = async (token: string) => {
//   let verifiedToken;
//   try {
//     verifiedToken = jwtHelper.verifyToken(
//       token,
//       config.jwt.refresh_secret as Secret
//     );
//   } catch {
//     throw new AppError(403, "Invalid Refresh Token");
//   }

//   const { email } = verifiedToken;
//   const user = await User.findOne({ email });
//   if (!user || user.refreshToken !== token) {
//     throw new AppError(403, "Refresh token not valid or expired");
//   }

//   const newAccessToken = jwtHelper.generateToken(
//     { email: user.email, role: user.role },
//     config.jwt.access_secret as Secret,
//     config.jwt.access_expires_in
//   );

//   return { accessToken: newAccessToken };
// };

// // const sendResetOtp = async (email: string) => {
// //   const user = await User.findOne({ email });
// //   if (!user) throw new AppError(400, "User not found");
// //   //   if (!user.isVerified) throw new AppError(400, "User not verified");

// //   const otp = Math.floor(100000 + Math.random() * 900000).toString();
// //   const otpExpiry = new Date();
// //   otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

// //   user.otp = otp;
// //   user.otpExpiry = otpExpiry;
// //   await user.save();

// //   await sendMailer(user.email, "OTP for reset password", otp);
// //   return { message: "OTP sent to your email" };
// // };

// // const verifyOtp = async (email: string, otp: string) => {
// //   const user = await User.findOne({ email });
// //   if (!user) throw new AppError(400, "User not found");
// //   //   if (!user.isVerified) throw new AppError(400, "User not verified");

// //   if (user.otp !== otp) throw new AppError(400, "Invalid OTP");
// //   if (user.otpExpiry && user.otpExpiry < new Date())
// //     throw new AppError(400, "OTP expired");

// //   user.otp = undefined;
// //   user.otpExpiry = undefined;
// //   await user.save();

// //   return { message: "OTP verified" };
// // };

// // const resetPassword = async (email: string, newPassword: string) => {
// //   const user = await User.findOne({ email });
// //   if (!user) throw new AppError(400, "User not found");

// //   console.log(email, newPassword);
// //   //   if (!user.isVerified) throw new AppError(400, "User not verified");

// //   user.password = newPassword;
// //   await user.save();

// //   return { message: "Password reset successfully" };
// // };

// // reset password email
// const resetPasswordemail = async (email: string) => {
//   const user = await User.findOne({ email });
//   if (!user) throw new AppError(401, "User not found");

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   user.otp = otp;
//   user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
//   await user.save();

//   await sendMailer(
//     user.email,
//     user.name,
//     createOtpTemplate(otp, user.email, "Your Company")
//   );

//   return { message: "OTP sent to your email" };
// };

// // verify otp
// const verifyOtpemail = async (email: string, otp: string) => {
//   const user = await User.findOne({ email });
//   if (!user) throw new AppError(401, "User not found");

//   if (user.otp !== otp) throw new AppError(401, "Invalid OTP");
//   if (user.otpExpiry && user.otpExpiry < new Date())
//     throw new AppError(401, "OTP expired");

//   user.otp = undefined;
//   user.otpExpiry = undefined;
//   await user.save();

//   return { message: "OTP verified" };
// };

// // reset password
// const resetPassword = async (email: string, newPassword: string) => {
//   const user = await User.findOne({ email });
//   if (!user) throw new AppError(404, "User not found");

//   user.password = newPassword;
//   await user.save();

//   return { message: "Password reset successfully" };
// };

// export const authService = {
//   loginUser,
//   refreshToken,
//   // sendResetOtp,
//   // verifyOtp,
//   resetPassword,
//   verifyOtpemail,
//   resetPasswordemail,
// };

import bcrypt from "bcryptjs";
import User from "../user/user.model";
import AppError from "../../error/appError";
import { jwtHelper } from "../../helper/jwtHelper";
import config from "../../config";
import { Secret } from "jsonwebtoken";
import { sendMailer } from "../../helper/sendMailer";
import createOtpTemplate from "../../utils/createOtpTemplate";

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
  user.refreshToken = refreshToken;
  await user.save();

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

// reset password otp

const sendResetOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(401, "User not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.reset_otp = otp;
  user.reset_otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
  await user.save();

  await sendMailer({
    to: user.email,
    subject: "Reset Password OTP",
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`, // fallback for non-HTML clients
    html: createOtpTemplate(otp, user.email, "Pixel Central"),
  });

  return { message: "OTP sent to your email" };
};

const verifyOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(401, "User not found");

  if (user.reset_otp !== otp) throw new AppError(401, "Invalid OTP");
  if (user.otpExpiry && user.otpExpiry < new Date())
    throw new AppError(401, "OTP expired");

  user.reset_otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  return { message: "OTP verified" };
};
const verifyResetOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(401, "User not found");

  if (user.reset_otp !== otp) throw new AppError(401, "Invalid OTP");
  if (user.reset_otpExpiry && user.reset_otpExpiry < new Date())
    throw new AppError(401, "OTP expired");

  // user.reset_otp = undefined;
  // user.reset_otpExpiry = undefined;
  // await user.save();

  return { message: "OTP verified" };
};

const resetPassword = async (email: string, newPassword: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");
  if (user.reset_otp !== otp) throw new AppError(401, "Invalid OTP");
  if (user.reset_otpExpiry && user.reset_otpExpiry < new Date())
    throw new AppError(401, "OTP expired");

  user.password = newPassword;
  await user.save();

  return { message: "Password reset successfully" };
};

export const authService = {
  loginUser,
  refreshToken,
  sendResetOtp,
  verifyOtp,
  verifyResetOtp,
  resetPassword,
};

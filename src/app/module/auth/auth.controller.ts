// import config from "../../config";
// import catchAsycn from "../../utils/catchAsycn";
// import sendResponse from "../../utils/sendRespopnse";
// import { authService } from "./auth.service";

// const loginUser = catchAsycn(async (req, res) => {
//   const result = await authService.loginUser(req.body);
//   // res.cookie("refreshToken", result.refreshToken, {
//   //   httpOnly: true,
//   //   secure: config.env !== "development",
//   // });
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "User logged in successfully",
//     data: {
//       accessToken: result.accessToken,
//       refreshToken: result.refreshToken,
//       user: result.user,
//     },
//   });
// });

// const refreshToken = catchAsycn(async (req, res) => {
//   // const { refreshToken } = req.cookies;
//   const { refreshToken } = req.body;
//   const result = await authService.refreshToken(refreshToken);
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Access token generated successfully",
//     data: result,
//   });
// });

// const sendResetOtp = catchAsycn(async (req, res) => {
//   const { email } = req.body;
//   const result = await authService.sendResetOtp(email);
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "OTP sent successfully",
//     data: result,
//   });
// });
// const verifyOtp = catchAsycn(async (req, res) => {
//   const { email, otp } = req.body;
//   const result = await authService.verifyOtp(email, otp);
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "OTP verified successfully",
//     data: result,
//   });
// });
// const resetPassword = catchAsycn(async (req, res) => {
//   const { email, newPassword } = req.body;
//   const result = await authService.resetPassword(email, newPassword);
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Password reset successfully",
//     data: result,
//   });
// });

// export const authController = {
//   loginUser,
//   refreshToken,
//   sendResetOtp,
//   verifyOtp,
//   resetPassword,
// };

import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { authService } from "./auth.service";

const loginUser = catchAsycn(async (req, res) => {
  const result = await authService.loginUser(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});

const refreshToken = catchAsycn(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Access token generated successfully",
    data: result,
  });
});

const sendResetOtp = catchAsycn(async (req, res) => {
  const { email } = req.body;
  const result = await authService.sendResetOtp(email);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "OTP sent successfully",
    data: result,
  });
});

const verifyOtp = catchAsycn(async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyOtp(email, otp);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "OTP verified successfully",
    data: result,
  });
});
const verifyResetOtp = catchAsycn(async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyResetOtp(email, otp);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "OTP verified successfully",
    data: result,
  });
});

const resetPassword = catchAsycn(async (req, res) => {
  const { email, newPassword,otp } = req.body;
  const result = await authService.resetPassword(email, newPassword,otp);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password reset successfully",
    data: result,
  });
});

export const authController = {
  loginUser,
  refreshToken,
  sendResetOtp,
  verifyOtp,
  verifyResetOtp,
  resetPassword,
};


// import express from "express";
// import { authController } from "./auth.controller";
// const router = express.Router();

// router.post("/login", authController.loginUser);
// router.post("/refresh-token", authController.refreshToken);
// router.post("/send-reset-otp", authController.sendResetOtp);
// router.post("/verify-otp", authController.verifyOtp);
// router.post("/reset-password", authController.resetPassword);

// export const authRouter = router;


import express from "express";
import { authController } from "./auth.controller";
import { userControllers } from "../user/user.controller";

const router = express.Router();

router.post("/register", userControllers.createUser);
router.post("/login", authController.loginUser);
router.post("/refresh-token", authController.refreshToken);
router.post("/send-reset-otp", authController.sendResetOtp);
router.post("/verify-reset-otp", authController.verifyResetOtp);
router.post("/reset-password", authController.resetPassword);


router.post("/verify-otp", authController.verifyOtp);

export const authRouter = router;

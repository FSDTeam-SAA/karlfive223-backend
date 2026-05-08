import catchAsycn from "../../utils/catchAsycn";
import { FCM } from "./fcm.model";


export const createFCM = catchAsycn( async (req, res) => {
    const { fcmToken, user } = req.body;
    const fcm = new FCM({ fcmToken, user });
    await fcm.save();
    res.status(201).json({
      success: true,
      message: "FCM token created successfully",
      data: fcm,
    });

  })
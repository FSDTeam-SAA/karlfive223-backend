import express from "express";
import { fileUploader } from "../../helper/fileUploded";
import auth from "../../middlewares/Auth";
import { createFCM } from "../fcm/fcm.controller";
import { userrole } from "./user.constent";
import { userControllers } from "./user.controller";
const router = express.Router();

router.get(
  "/profile",
  auth(userrole.admin, userrole.manager, userrole.player),
  userControllers.getUserByEmail
);
router.get(
  "/profile/:id",
  userControllers.getUserById
);
router.patch(
  "/playing-level",
  auth(userrole.admin, userrole.manager, userrole.player),
  userControllers.playingLevel
);


router.get(
  "/running-coupon",
  auth(userrole.admin, userrole.manager, userrole.player, userrole.referee),
  userControllers.getRunningCoupon
);
router.patch(
  "/gender",
  auth(userrole.admin, userrole.manager, userrole.player),
  userControllers.gender
);

router.put(
  "/update-profile",
  auth(userrole.admin, userrole.manager, userrole.player),
  fileUploader.upload.single("image"),
  userControllers.updatedProfile
);

router.delete(
  "/:id",
  auth(userrole.admin,userrole.manager, userrole.player),
  userControllers.deleteUser
);


router.post("/update-fcm-token",
  auth(userrole.admin, userrole.manager, userrole.player),
  createFCM
);

export const userRouter = router;

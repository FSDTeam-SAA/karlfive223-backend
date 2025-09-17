import express from "express";
import { userControllers } from "./user.controller";
import auth from "../../middlewares/Auth";
import { userrole } from "./user.constent";
import { fileUploader } from "../../helper/fileUploded";
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

export const userRouter = router;

import express from "express";
import { userControllers } from "./user.controller";
import auth from "../../middlewares/Auth";
import { userrole } from "./user.constent";
const router = express.Router();

router.post("/create", userControllers.createUser);
router.get(
  "/profile",
  auth(userrole.admin, userrole.manager, userrole.player),
  userControllers.getUserByEmail
);
router.patch(
  "/playing-level",
  auth(userrole.admin, userrole.player),
  userControllers.playingLevel
);

export const userRouter = router;

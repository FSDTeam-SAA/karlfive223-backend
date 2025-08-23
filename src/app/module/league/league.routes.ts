import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { leagueController } from "./league.controller";
import { fileUploader } from "../../helper/fileUploded";
const router = express.Router();

router.post(
  "/create",
  auth(userrole.manager),
  fileUploader.upload.single("logo"),
  leagueController.createLeague
);

export const leagueRouter = router;

import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { teamController } from "./team.controller";
import { fileUploader } from "../../helper/fileUploded";
const router = express.Router();

router.post(
  "/create",
  auth(userrole.player),
  fileUploader.upload.single("logo"),
  teamController.createTeam
);

export const teamRouter = router;

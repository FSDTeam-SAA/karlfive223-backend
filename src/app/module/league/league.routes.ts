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

router.get(
  "/all-league",
  auth(userrole.manager),
  leagueController.getAllLeagues
);

router.get("/:id", auth(userrole.manager), leagueController.getLeagueById);
router.patch(
  "/:id",
  auth(userrole.manager),
  fileUploader.upload.single("logo"),
  leagueController.updateLeague
);
router.delete("/:id", auth(userrole.manager), leagueController.deleteLeague);

export const leagueRouter = router;

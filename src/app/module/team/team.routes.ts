import express from "express";
import { fileUploader } from "../../helper/fileUploded";
import auth from "../../middlewares/Auth";
import requestValidation from "../../middlewares/requestValidation";
import { userrole } from "../user/user.constent";
import { teamController } from "./team.controller";
import { teamValidation } from "./team.valadetion";

const router = express.Router();

router.post(
  "/create",
  auth(userrole.player,userrole.manager, userrole.admin),
  fileUploader.upload.single("logo"),
  teamController.createTeam
);

router.get("/all-team", auth(userrole.player,userrole.manager, userrole.admin), teamController.getAllTeams);

router.patch(
  "/update-status/:id",
  teamController.updatedStatus
);

router.patch(
  "/change-member/:id",
  auth(userrole.player, userrole.manager, userrole.admin),
  requestValidation(teamValidation.changeTeamMemberSchema),
  teamController.changeTeamMember
);


router.get("/:id", auth(userrole.player,userrole.manager, userrole.admin), teamController.getSingleTeam);
router.patch(
  "/:id",
  auth(userrole.player,userrole.manager, userrole.admin),
  fileUploader.upload.single("logo"),
  teamController.updateTeam
);
router.delete("/:id", auth(userrole.player,userrole.manager, userrole.admin), teamController.deleteTeam);



export const teamRouter = router;

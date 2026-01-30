import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { leagueController } from "./league.controller";
import { fileUploader } from "../../helper/fileUploded";

const router = express.Router();

// CREATE league (with logo + banner)
router.post(
  "/create",
  auth(userrole.manager,userrole.player),
  fileUploader.upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  leagueController.createLeague
);

// GET all leagues
router.get("/all-league"  ,  auth(userrole.manager,userrole.player,userrole.admin), leagueController.getAllLeagues);

router.get("/hh/all-league"  ,  leagueController.getAllLeaguesfree);

// GET league by id
router.get("/:id",   leagueController.getLeagueById);

// UPDATE league (with logo + banner)
router.patch(
  "/:id",
  fileUploader.upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  leagueController.updateLeague
);

// DELETE league
router.delete("/:id",  leagueController.deleteLeague);

export const leagueRouter = router;

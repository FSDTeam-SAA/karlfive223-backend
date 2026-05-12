import express from "express";
import { fileUploader } from "../../helper/fileUploded";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { americanoController } from "./americano.controller";

const router = express.Router();

router.post(
  "/create",
  auth(userrole.player, userrole.manager, userrole.admin),
  fileUploader.upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  americanoController.createAmericanoLeague
);

router.get(
  "/all",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.getAllAmericanoLeagues
);

router.get(
  "/my-leagues",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.getMyAmericanoLeagues
);

router.post(
  "/:leagueId/join",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.joinAmericanoLeague
);

router.post(
  "/join-by-otp",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.joinAmericanoLeagueByOtp
);

router.post(
  "/:leagueId/generate-fixtures",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.generateAmericanoFixtures
);

router.get(
  "/:leagueId/fixtures",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.getAmericanoFixtures
);

router.get(
  "/:leagueId/standings",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.getAmericanoStandings
);

router.patch(
  "/matches/:matchId/result",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.submitAmericanoMatchResult
);

router.get(
  "/:leagueId",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.getAmericanoLeagueById
);

export const americanoRouter = router;

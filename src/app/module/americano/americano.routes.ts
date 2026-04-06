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

// Share OTP (get joinOtp for sharing)
router.get(
  "/:leagueId/share-otp",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.shareLeagueOtp
);

// Get all players in a league
router.get(
  "/:leagueId/players",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.getLeaguePlayers
);

// Remove player from league
router.delete(
  "/:leagueId/players/:playerId",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.removePlayerFromLeague
);

// Edit/Update league
router.patch(
  "/:leagueId",
  auth(userrole.player, userrole.manager, userrole.admin),
  fileUploader.upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  americanoController.updateAmericanoLeague
);

// Delete league
router.delete(
  "/:leagueId",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.deleteAmericanoLeague
);

// Get all matches for a league
router.get(
  "/:leagueId/matches",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.getLeagueMatches
);

// Get score for a specific match
router.get(
  "/matches/:matchId/score",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.getAmericanoMatchScore
);

// Edit match score
router.patch(
  "/matches/:matchId/edit-score",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.editAmericanoMatchScore
);

// Assign court number to match
router.patch(
  "/matches/:matchId/assign-court",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.assignCourtNumberToMatch
);

// Update match details
router.patch(
  "/matches/:matchId",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.updateAmericanoMatch
);

// Delete match
router.delete(
  "/matches/:matchId",
  auth(userrole.player, userrole.manager, userrole.admin),
  americanoController.deleteAmericanoMatch
);

export const americanoRouter = router;

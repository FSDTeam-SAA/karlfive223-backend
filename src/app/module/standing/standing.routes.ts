import express from "express";
import { standingController } from "./standing.controller";

const router = express.Router();

router.get("/:leagueId", standingController.getStandingsByLeague);

export const standingRouter = router;

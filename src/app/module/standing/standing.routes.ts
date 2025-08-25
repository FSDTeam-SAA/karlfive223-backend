import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import {
  getLeagueStandings,
  getAllStandings,
  getSingleStanding,
  updateStanding,
  removeStanding,
} from "./standing.controller";

const router = express.Router();

// Public (or protect if you want)
router.get("/league/:leagueId", getLeagueStandings);

// Admin/manager utilities
router.get("/all", auth(userrole.manager), getAllStandings);
router.get("/:id", auth(userrole.manager), getSingleStanding);
router.patch("/:id", auth(userrole.manager), updateStanding);
router.delete("/:id", auth(userrole.manager), removeStanding);

export const standingRouter = router;

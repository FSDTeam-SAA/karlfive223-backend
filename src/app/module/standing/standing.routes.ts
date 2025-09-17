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
router.get("/all",  getAllStandings);
router.get("/:id",  getSingleStanding);
router.patch("/:id",  updateStanding);
router.delete("/:id", removeStanding);

export const standingRouter = router;

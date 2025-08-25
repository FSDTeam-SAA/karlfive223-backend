// import express from "express";
// import { getStandings, standingController } from "./standing.controller";
// import auth from "../../middlewares/Auth";
// import { userrole } from "../user/user.constent";

// const router = express.Router();

// // Manager can create/update/delete standings manually if needed
// router.post("/create", auth(userrole.manager), standingController.createStanding);
// router.get("/all-standing", standingController.getAllStandings);

// router.get("/league/:leagueId", getStandings);

// router.get("/:id", standingController.getSingleStanding);
// router.patch("/:id", auth(userrole.manager), standingController.updateStanding);
// router.delete("/:id", auth(userrole.manager), standingController.deleteStanding);

// export const standingRouter = router;

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

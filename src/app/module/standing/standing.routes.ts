import express from "express";
import { getStandings, standingController } from "./standing.controller";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";

const router = express.Router();

// Manager can create/update/delete standings manually if needed
router.post("/create", auth(userrole.manager), standingController.createStanding);
router.get("/all-standing", standingController.getAllStandings);

router.get("/league/:leagueId", getStandings);

router.get("/:id", standingController.getSingleStanding);
router.patch("/:id", auth(userrole.manager), standingController.updateStanding);
router.delete("/:id", auth(userrole.manager), standingController.deleteStanding);

export const standingRouter = router;

import express from "express";
import matchController, { generateMatchesForLeague } from "./match.controller";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";

const router = express.Router();

router.post("/generate-match", generateMatchesForLeague)
router.post("/create" , matchController.createMatch);
router.get("/all-match", matchController.getAllMatches);
router.get("/player-next-matches", auth(userrole.player, userrole.manager), matchController.getPlayerNextMatches);
router.get("/:id", matchController.getSingleMatch);
router.patch("/:id",   matchController.updateMatch);
router.delete("/:id", matchController.deleteMatch);

export const matchRouter = router;

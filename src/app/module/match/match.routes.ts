import express from "express";
import matchController from "./match.controller";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";

const router = express.Router();

router.post("/create", auth(userrole.manager), matchController.createMatch);
router.get("/all-match", matchController.getAllMatches);
router.get("/:id", matchController.getSingleMatch);
router.patch("/:id", auth(userrole.manager), matchController.updateMatch);
router.delete("/:id", auth(userrole.manager), matchController.deleteMatch);

export const matchRouter = router;

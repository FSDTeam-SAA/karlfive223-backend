import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { homeController } from "./home.controller";

const router = express.Router();

// Home screen search, e.g. GET /home/search?q=summer&limit=10
router.get(
  "/search",
  auth(userrole.player, userrole.manager, userrole.admin),
  homeController.search
);

export const homeRouter = router;

import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { referralController } from "./referral.controller";

const router = express.Router();

router.post(
  "/create",
  auth(userrole.admin, userrole.manager),
  referralController.createReferralPerson
);

router.get("/names", referralController.getReferralNames);

router.get(
  "/summary",
  auth(userrole.admin, userrole.manager),
  referralController.getReferralSummary
);

router.get(
  "/stats/:id",
  auth(userrole.admin, userrole.manager),
  referralController.getReferralDailyStats
);

export const referralRouter = router;

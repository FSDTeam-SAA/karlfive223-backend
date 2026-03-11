import express from "express";
import auth from "../../middlewares/Auth";
import requestValidation from "../../middlewares/requestValidation";
import { userrole } from "../user/user.constent";
import {
    approveEvent,
    createEvent,
    declineEvent,
    getAllEvents,
    getMyEvents,
    getSingleEvent,
} from "./event.controller";

const router = express.Router();

// ─── Club/Organizer Routes ────────────────────────────────────────────────────
// Only users with isOrganizer = true (club subscription) can create events
router.post(
  "/create",
  auth(userrole.player, userrole.manager, userrole.admin, userrole.referee),
  createEvent
);

router.get(
  "/my-events",
  auth(userrole.player, userrole.manager, userrole.admin, userrole.referee),
  getMyEvents
);

// ─── Manager/Admin Routes ─────────────────────────────────────────────────────
router.get(
  "/all",
  auth(userrole.manager, userrole.admin),
  getAllEvents
);

router.get(
  "/:id",
  auth(userrole.manager, userrole.admin, userrole.player, userrole.referee),
  getSingleEvent
);

router.patch(
  "/approve/:id",
  auth(userrole.manager, userrole.admin),
  approveEvent
);

router.patch(
  "/decline/:id",
  auth(userrole.manager, userrole.admin),
  declineEvent
);

export const eventRouter = router;

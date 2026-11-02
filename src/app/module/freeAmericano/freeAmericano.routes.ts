import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { freeAmericanoController } from "./freeAmericano.controller";

// Free one-day Americano. Open to every signed-up user (no subscription
// check), and every route is scoped to the event's creator in the service.
const router = express.Router();

const anyUser = auth(userrole.player, userrole.manager, userrole.admin);

router.post("/create", anyUser, freeAmericanoController.createEvent);

router.get("/mine", anyUser, freeAmericanoController.getMyEvents);

router.patch(
  "/matches/:matchId/result",
  anyUser,
  freeAmericanoController.submitMatchResult
);

router.patch(
  "/matches/:matchId/assign-court",
  anyUser,
  freeAmericanoController.assignCourtNumber
);

router.get("/:eventId", anyUser, freeAmericanoController.getEventById);

router.delete("/:eventId", anyUser, freeAmericanoController.deleteEvent);

router.get(
  "/:eventId/matches",
  anyUser,
  freeAmericanoController.getEventMatches
);

router.get(
  "/:eventId/standings",
  anyUser,
  freeAmericanoController.getEventStandings
);

export const freeAmericanoRouter = router;

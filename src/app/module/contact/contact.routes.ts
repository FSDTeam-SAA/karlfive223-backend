import express from "express";
import { contactController } from "./contact.controller";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
const router = express.Router();

router.post(
  "/create",
  auth(userrole.player, userrole.manager, userrole.referee),
  contactController.createContact
);

router.get(
  "/all-contact",
  auth(userrole.admin),
  contactController.getAllContact
);
router.get(
  "/:id",
  auth(userrole.admin, userrole.player, userrole.manager, userrole.referee),
  contactController.getSingleContact
);
router.patch(
  "/:id",
  auth(userrole.admin, userrole.player, userrole.manager, userrole.referee),
  contactController.updateContact
);
router.delete("/:id", auth(userrole.admin), contactController.deleteContact);

export const contactRouter = router;

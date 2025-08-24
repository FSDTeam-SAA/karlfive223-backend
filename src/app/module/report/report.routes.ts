import express from "express";
import { reportController } from "./report.controller";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { fileUploader } from "../../helper/fileUploded";
const router = express.Router();

router.post(
  "/create",
  auth(userrole.manager, userrole.player, userrole.referee),
  fileUploader.upload.single("file"),
  reportController.createReport
);

router.get(
  "/all-report",
  auth(userrole.admin, userrole.manager, userrole.player, userrole.referee),
  reportController.getAllReports
);
router.get(
  "/:id",
  auth(userrole.admin, userrole.manager, userrole.player, userrole.referee),
  reportController.getReport
);
router.patch(
  "/:id",
  auth(userrole.admin, userrole.manager, userrole.player, userrole.referee),
  fileUploader.upload.single("file"),
  reportController.updateReport
);
router.delete(
  "/:id",
  auth(userrole.admin, userrole.manager, userrole.player, userrole.referee),
  reportController.deleteReport
);

export const reportRouter = router;

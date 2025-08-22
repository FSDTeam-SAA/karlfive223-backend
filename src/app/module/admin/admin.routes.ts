import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { adminController } from "./admin.controller";
const router = express.Router();

router.get("/allUser", auth(userrole.admin), adminController.getAllUsers);
router.patch(
  "/updated-role/:id",
  auth(userrole.admin),
  adminController.updatedRoleByUser
);
router.delete(
  "/delete-user/:id",
  auth(userrole.admin),
  adminController.deletedUser
);

// vanue
router.post("/create-vanue", auth(userrole.admin), adminController.createVanue);

export const adminRouter = router;

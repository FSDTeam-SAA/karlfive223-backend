import express from "express";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";
import { adminController } from "./admin.controller";
const router = express.Router();

router.get("/allUser", auth(userrole.admin), adminController.getAllUsers);

export const adminRouter = router;

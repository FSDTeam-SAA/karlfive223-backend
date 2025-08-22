import express from "express";
import { userControllers } from "./user.controller";
const router = express.Router();

router.post("/create", userControllers.createUser);

export const userRouter = router;

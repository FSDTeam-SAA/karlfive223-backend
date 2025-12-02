import express from "express";
import { createChat, deleteMessage, getChatForUser, getSingleChat, getSingleChatWithScaduleId, sendMessage, updateMessage } from "./chat.controller";
import auth from "../../middlewares/Auth";
import { userrole } from "../user/user.constent";

const router = express.Router();

router.post("/create-chat", auth(userrole.player,userrole.manager, userrole.admin), createChat);
router.post("/send-message", auth(userrole.player,userrole.manager, userrole.admin), sendMessage);
router.put("/update", auth(userrole.player,userrole.manager, userrole.admin), updateMessage);
router.delete("/remove", auth(userrole.player,userrole.manager, userrole.admin), deleteMessage);
router.get("/get-chat", auth(userrole.player,userrole.manager, userrole.admin), getChatForUser);
router.get("/get-single-chat/:chatId", auth(userrole.player,userrole.manager, userrole.admin), getSingleChat);
router.get("/get-single-chat-with-scaduleid/:chatId", auth(userrole.player,userrole.manager, userrole.admin), getSingleChatWithScaduleId);
// router.get("/get-chat-farm/:farmId", auth(userrole.player,userrole.manager, userrole.admin), getChatForFarm);

export const chatRouter = router

import express from "express";
import { userRouter } from "../module/user/user.routes";
import { authRouter } from "../module/auth/auth.routes";
import { adminRouter } from "../module/admin/admin.routes";
import { leagueRouter } from "../module/league/league.routes";
import { teamRouter } from "../module/team/team.routes";
import { matchRouter } from "../module/match/match.routes";
import { contactRouter } from "../module/contact/contact.routes";
import { reportRouter } from "../module/report/report.routes";
import { standingRouter } from "../module/standing/standing.routes";
import { paymentRouter } from "../module/payment/payment.route";
import { notificationRouter } from "../module/notification/notification.route";
import { chatRouter } from "../module/chat/chat.route";
const router = express.Router();

const allRouter = [
  { path: "/user", name: userRouter },
  { path: "/auth", name: authRouter },
  { path: "/admin", name: adminRouter },
  { path: "/league", name: leagueRouter },
  { path: "/team", name: teamRouter },
  { path: "/match", name: matchRouter },
  { path: "/contact", name: contactRouter },
  { path: "/report", name: reportRouter },
  { path: "/standing", name: standingRouter },
  { path: "/payment", name: paymentRouter },
  { path: "/notification", name: notificationRouter },
  { path: "/chat", name: chatRouter },
];

allRouter.forEach((route) => {
  router.use(route.path, route.name);
});

export default router;

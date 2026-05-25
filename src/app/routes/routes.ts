import express from "express";
import { adminRouter } from "../module/admin/admin.routes";
import { americanoRouter } from "../module/americano/americano.routes";
import { authRouter } from "../module/auth/auth.routes";
import { autoSubscriptionRouter } from "../module/autoSubscription/autoSubscription.route";
import { chatRouter } from "../module/chat/chat.route";
import { contactRouter } from "../module/contact/contact.routes";
import { couponRouter } from "../module/coupon/coupon.routes";
import { eventRouter } from "../module/event/event.routes";
import { leagueRouter } from "../module/league/league.routes";
import { matchRouter } from "../module/match/match.routes";
import { notificationRouter } from "../module/notification/notification.route";
import { DualAmericanoRoutes } from "../module/dualAmericano/dualAmericano.routes";
import { paymentRouter } from "../module/payment/payment.route";
import { recurringSubscriptionRouter } from "../module/recurringSubscription/recurringSubscription.route";
import { referralRouter } from "../module/referral/referral.routes";
import { reportRouter } from "../module/report/report.routes";
import { standingRouter } from "../module/standing/standing.routes";
import { subscriptionRouter } from "../module/subscription/subscription.routes";
import { teamRouter } from "../module/team/team.routes";
import { userRouter } from "../module/user/user.routes";
const router = express.Router();

const allRouter = [
  { path: "/user", name: userRouter },
  { path: "/auth", name: authRouter },
  { path: "/admin", name: adminRouter },
  { path: "/americano", name: americanoRouter },
  { path: "/dual-americano", name: DualAmericanoRoutes },
  { path: "/league", name: leagueRouter },
  { path: "/team", name: teamRouter },
  { path: "/match", name: matchRouter },
  { path: "/contact", name: contactRouter },
  { path: "/coupon", name: couponRouter },
  { path: "/report", name: reportRouter },
  { path: "/standing", name: standingRouter },
  { path: "/payment", name: paymentRouter },
  { path: "/referral", name: referralRouter },
  { path: "/notification", name: notificationRouter },
  { path: "/chat", name: chatRouter },
  { path: "/subscription", name: subscriptionRouter },
  { path: "/auto-subscription", name: autoSubscriptionRouter },
  { path: "/recurring-subscription", name: recurringSubscriptionRouter },
  { path: "/event", name: eventRouter },
];

allRouter.forEach((route) => {
  router.use(route.path, route.name);
});

export default router;

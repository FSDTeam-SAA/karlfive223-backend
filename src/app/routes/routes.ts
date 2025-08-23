import express from "express";
import { userRouter } from "../module/user/user.routes";
import { authRouter } from "../module/auth/auth.routes";
import { adminRouter } from "../module/admin/admin.routes";
import { leagueRouter } from "../module/league/league.routes";
import { teamRouter } from "../module/team/team.routes";
const router = express.Router();

const allRouter = [
  { path: "/user", name: userRouter },
  { path: "/auth", name: authRouter },
  { path: "/admin", name: adminRouter },
  { path: "/league", name: leagueRouter },
  { path: "/team", name: teamRouter },
];

allRouter.forEach((route) => {
  router.use(route.path, route.name);
});

export default router;

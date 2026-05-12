import express from 'express';
import auth from '../../middlewares/Auth';
import { userrole } from '../user/user.constent';
import { couponControllers } from './coupon.controller';

const router = express.Router();

router.post(
  '/create',
  auth(userrole.admin, userrole.manager),
  couponControllers.createCoupon
);

router.get(
  '/running',
  auth(userrole.admin, userrole.manager, userrole.player, userrole.referee),
  couponControllers.getRunningCoupon
);

router.get(
  '/manage/all',
  auth(userrole.admin, userrole.manager),
  couponControllers.getAllCouponsByStatus
);

router.patch(
  '/:couponId/stop',
  auth(userrole.admin, userrole.manager),
  couponControllers.stopCoupon
);

export const couponRouter = router;

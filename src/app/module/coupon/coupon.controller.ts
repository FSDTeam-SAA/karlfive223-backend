import { Request, Response } from 'express';
import catchAsycn from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendRespopnse';
import { couponService } from './coupon.service';

const createCoupon = catchAsycn(async (req: Request, res: Response) => {
  const result = await couponService.createCoupon(req.user?.email, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Coupon created successfully',
    data: result,
  });
});

const getRunningCoupon = catchAsycn(async (_req: Request, res: Response) => {
  const coupon = await couponService.getRunningCoupon();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Running coupon fetched successfully',
    data: coupon,
  });
});

const stopCoupon = catchAsycn(async (req: Request, res: Response) => {
  const { couponId } = req.params;
  const result = await couponService.stopCoupon(req.user?.email, couponId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Coupon stopped successfully',
    data: result,
  });
});

const getAllCouponsByStatus = catchAsycn(async (req: Request, res: Response) => {
  const result = await couponService.getAllCouponsByStatus(req.user?.email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All coupons fetched successfully',
    data: result,
  });
});

export const couponControllers = {
  createCoupon,
  getRunningCoupon,
  stopCoupon,
  getAllCouponsByStatus,
};

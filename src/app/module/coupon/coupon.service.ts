import AppError from '../../error/appError';
import User from '../user/user.model';
import Coupon from './coupon.model';

type CreateCouponPayload = {
  title?: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
};

const COUPON_REWARD_DAYS = 30;

const createUniqueCouponCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const existing = await Coupon.findOne({ code });

    if (!existing) {
      return code;
    }
  }

  throw new AppError(500, 'Failed to generate a unique coupon code');
};

const resolveCouponStatus = (startDate: Date, endDate: Date, now = new Date()) => {
  if (endDate <= startDate) {
    throw new AppError(400, 'End date must be after start date');
  }

  if (endDate < now) {
    return 'expired' as const;
  }

  if (startDate <= now && endDate >= now) {
    return 'running' as const;
  }

  return 'scheduled' as const;
};

const createCoupon = async (managerEmail: string, payload: CreateCouponPayload) => {
  const manager = await User.findOne({ email: managerEmail });
  if (!manager) {
    throw new AppError(404, 'Manager not found');
  }

  if (!['manager', 'admin'].includes(manager.role)) {
    throw new AppError(403, 'Only managers or admins can create coupons');
  }

  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new AppError(400, 'Valid start and end dates are required');
  }

  const code = await createUniqueCouponCode();
  const status = resolveCouponStatus(startDate, endDate);

  const coupon = await Coupon.create({
    createdBy: manager._id,
    code,
    title: payload.title,
    description: payload.description,
    startDate,
    endDate,
    status,
    rewardDays: COUPON_REWARD_DAYS,
  });

  return coupon;
};

const getRunningCoupon = async () => {
  const now = new Date();

  await Coupon.updateMany(
    { endDate: { $lt: now }, status: { $ne: 'expired' } },
    { status: 'expired' }
  );

  await Coupon.updateMany(
    {
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: { $ne: 'running' },
    },
    { status: 'running' }
  );

  const coupon = await Coupon.findOne({
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 });

  return coupon;
};

const stopCoupon = async (managerEmail: string, couponId: string) => {
  const manager = await User.findOne({ email: managerEmail });
  if (!manager) {
    throw new AppError(404, 'Manager not found');
  }

  if (!['manager', 'admin'].includes(manager.role)) {
    throw new AppError(403, 'Only managers or admins can stop coupons');
  }

  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new AppError(404, 'Coupon not found');
  }

  if (coupon.status === 'expired') {
    throw new AppError(400, 'Coupon is already expired');
  }

  // Update coupon status to expired
  const updatedCoupon = await Coupon.findByIdAndUpdate(
    couponId,
    { status: 'expired', endDate: new Date() },
    { new: true }
  ).populate('createdBy', 'name email role');

  return updatedCoupon;
};

const getAllCouponsByStatus = async (managerEmail: string) => {
  const manager = await User.findOne({ email: managerEmail });
  if (!manager) {
    throw new AppError(404, 'Manager not found');
  }

  if (!['manager', 'admin'].includes(manager.role)) {
    throw new AppError(403, 'Only managers or admins can view all coupons');
  }

  const now = new Date();

  // Update statuses based on current date
  await Coupon.updateMany(
    { endDate: { $lt: now }, status: { $ne: 'expired' } },
    { status: 'expired' }
  );

  await Coupon.updateMany(
    {
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: { $ne: 'running' },
    },
    { status: 'running' }
  );

  // Get all coupons sorted by creation date (old to new)
  const allCoupons = await Coupon.find()
    .populate('createdBy', 'name email role')
    .sort({ createdAt: 1 });

  // Group coupons by status
  const groupedCoupons = {
    scheduled: allCoupons.filter((c) => c.status === 'scheduled'),
    running: allCoupons.filter((c) => c.status === 'running'),
    expired: allCoupons.filter((c) => c.status === 'expired'),
  };

  // Calculate summary
  const summary = {
    totalCoupons: allCoupons.length,
    scheduledCount: groupedCoupons.scheduled.length,
    runningCount: groupedCoupons.running.length,
    expiredCount: groupedCoupons.expired.length,
  };

  return {
    summary,
    coupons: groupedCoupons,
  };
};

export const couponService = {
  createCoupon,
  getRunningCoupon,
  stopCoupon,
  getAllCouponsByStatus,
};


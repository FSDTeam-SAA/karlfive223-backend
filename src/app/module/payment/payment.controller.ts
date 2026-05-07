import Stripe from 'stripe';
import AppError from '../../error/appError';
import catchAsycn from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendRespopnse';
import AmericanoLeague from '../americano/americanoLeague.model';
import AmericanoMatch from '../americano/americanoMatch.model';
import Event from '../event/event.model';
import League from '../league/league.model';
import Match from '../match/match.model';
import { PLAN_DETAILS, SubscriptionPlanType } from '../subscription/subscription.constant';
import User from '../user/user.model';
import { Payment } from './payment.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

// ─── Create Payment Intent ────────────────────────────────────────────────────
// For league payments  : body = { userId, league, amount, team }
// For subscription     : body = { userId, amount, plan: 'basic'|'gold'|'club' }
export const createPayment = catchAsycn(async (req, res) => {
  const { userId, league, amount, team, plan } = req.body; 
  //TODO: Does previous subscrription will be work with this? mabe need to make the plan field as not mandetory

  if (!userId || !amount) {
    throw new AppError(400, 'userId and amount are required');
  }

  const isSubscription = !league;
  if (isSubscription) {
    if (!plan || !['basic', 'gold', 'club'].includes(plan)) {
      throw new AppError(400, "plan must be one of 'basic', 'gold', 'club'");
    }
    const planDetails = PLAN_DETAILS[plan as SubscriptionPlanType];
    if (Math.round(amount * 100) !== Math.round(planDetails.price * 100)) {
      throw new AppError(
        400,
        `Amount ${amount} does not match plan price ${planDetails.price}`
      );
    }
  }

  try {
    // let customerId = user.stripeCustomerId;
    // if (!customerId) {
    const user= await User.findById(userId);
      const customer = await stripe.customers.create({
        email: user!.email,
        metadata: { userId },
      });
      const customerId = customer.id;
      // await User.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    // }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      setup_future_usage: 'off_session',
      customer: customerId,
      metadata: {
        userId,
        ...(league ? { league } : {}),
        ...(team ? { team } : {}),
        ...(plan ? { plan } : {}),
        type: isSubscription ? 'subscription' : 'league',
      },
    });

    const paymentInfo = new Payment({
      userId,
      ...(league ? { league } : {}),
      ...(team ? { team } : {}),
      amount,
      stripeCustomerId: customerId,
      transactionId: paymentIntent.id,
      status: 'pending',
      type: isSubscription ? 'subscription' : 'league',
      ...(isSubscription ? { subscriptionPlan: plan } : {}),
    });
    await paymentInfo.save();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payment intent created',
      data: { transactionId: paymentIntent.client_secret },
    });
  } catch (error: any) {
    console.error('Error creating PaymentIntent:', error);
    throw new AppError(500, error.message ?? 'Server Error');
  }
});

// ─── Confirm Payment ──────────────────────────────────────────────────────────
export const confirmPayment = catchAsycn(async (req, res) => {
  const { paymentIntentId,paymentMethodId } = req.body;

  if (!paymentIntentId) {
    throw new AppError(400, 'paymentIntentId is required');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const paymentRecord = await Payment.findOne({ transactionId: paymentIntentId });

  if (!paymentRecord) {
    throw new AppError(404, 'Payment record not found');
  }

  if (paymentIntent.status === 'succeeded') {
    const updateData: any = { status: 'success' };

    if (paymentRecord.type === 'subscription') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      updateData.expiryDate = expiryDate;

      const plan = paymentRecord.subscriptionPlan as SubscriptionPlanType;
      const planDetails = plan ? PLAN_DETAILS[plan] : null;

      if (planDetails) {
        await User.findByIdAndUpdate(paymentRecord.userId, {
          leaguesCreatedCount: 0,
          leaguesJoinedCount: 0,
          isOrganizer: plan === 'club',
        });
      }
    }

    await Payment.findOneAndUpdate(
      { transactionId: paymentIntentId },
      updateData
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payment successful',
      data: { transactionId: paymentIntentId },
    });
  } else {
    await Payment.findOneAndUpdate(
      { transactionId: paymentIntentId },
      { status: 'failed' }
    );

    throw new AppError(400, 'Payment was not successful');
  }
});

// ─── All Payments (admin) ─────────────────────────────────────────────────────
export const allPayment = catchAsycn(async (_req, res) => {
  const payment = await Payment.find().populate('userId', 'name email');
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All payments',
    data: payment,
  });
});

// ─── Manager Analytics: Subscription income (day + month) ───────────────────
export const getSubscriptionIncomeDayMonth = catchAsycn(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage: any = {
    type: 'subscription',
    status: 'success',
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      const start = new Date(String(startDate));
      start.setHours(0, 0, 0, 0);
      matchStage.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt.$lte = end;
    }
  }

  const [dayWise, monthWise, total] = await Promise.all([
    Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          income: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          day: '$_id',
          income: 1,
          totalPayments: 1,
        },
      },
    ]),
    Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt',
            },
          },
          income: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: '$_id',
          income: 1,
          totalPayments: 1,
        },
      },
    ]),
    Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalPayments: 1,
        },
      },
    ]),
  ]);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription income (day/month) fetched successfully',
    data: {
      summary: total[0] || { totalIncome: 0, totalPayments: 0 },
      dayWise,
      monthWise,
    },
  });
});

// ─── Manager Analytics: Subscription income by category(plan) ───────────────
export const getSubscriptionIncomeCategoryWise = catchAsycn(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage: any = {
    type: 'subscription',
    status: 'success',
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      const start = new Date(String(startDate));
      start.setHours(0, 0, 0, 0);
      matchStage.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt.$lte = end;
    }
  }

  const [monthCategoryRows, monthTotalsRows, overallTotalsRows, overallCategoryRows] =
    await Promise.all([
      Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              month: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$createdAt',
                },
              },
              category: { $ifNull: ['$subscriptionPlan', 'unknown'] },
            },
            income: { $sum: '$amount' },
            totalPayments: { $sum: 1 },
          },
        },
        { $sort: { '_id.month': 1, income: -1 } },
        {
          $project: {
            _id: 0,
            month: '$_id.month',
            category: '$_id.category',
            income: 1,
            totalPayments: 1,
          },
        },
      ]),
      Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$createdAt',
              },
            },
            totalIncome: { $sum: '$amount' },
            totalPayments: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            month: '$_id',
            totalIncome: 1,
            totalPayments: 1,
          },
        },
      ]),
      Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: '$amount' },
            totalPayments: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            totalIncome: 1,
            totalPayments: 1,
          },
        },
      ]),
      Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $ifNull: ['$subscriptionPlan', 'unknown'] },
            income: { $sum: '$amount' },
            totalPayments: { $sum: 1 },
          },
        },
        { $sort: { income: -1 } },
        {
          $project: {
            _id: 0,
            category: '$_id',
            income: 1,
            totalPayments: 1,
          },
        },
      ]),
    ]);

  const monthTotalsMap = new Map(
    monthTotalsRows.map((row: any) => [row.month, row])
  );

  const monthGroups = new Map<string, any[]>();
  for (const row of monthCategoryRows as any[]) {
    const list = monthGroups.get(row.month) || [];
    const monthSummary = monthTotalsMap.get(row.month) || {
      totalIncome: 0,
      totalPayments: 0,
    };

    const percentageByAmount =
      monthSummary.totalIncome > 0
        ? Number(((row.income / monthSummary.totalIncome) * 100).toFixed(2))
        : 0;
    const percentageByCount =
      monthSummary.totalPayments > 0
        ? Number(
            ((row.totalPayments / monthSummary.totalPayments) * 100).toFixed(2)
          )
        : 0;

    list.push({
      category: row.category,
      income: row.income,
      totalPayments: row.totalPayments,
      percentageByAmount,
      percentageByCount,
    });

    monthGroups.set(row.month, list);
  }

  const monthWise = monthTotalsRows.map((monthRow: any) => ({
    month: monthRow.month,
    totalIncome: monthRow.totalIncome,
    totalPayments: monthRow.totalPayments,
    categories: monthGroups.get(monthRow.month) || [],
  }));

  const overallSummary = overallTotalsRows[0] || {
    totalIncome: 0,
    totalPayments: 0,
  };

  const overallCategoryWise = (overallCategoryRows as any[]).map((row) => ({
    category: row.category,
    income: row.income,
    totalPayments: row.totalPayments,
    percentageByAmount:
      overallSummary.totalIncome > 0
        ? Number(((row.income / overallSummary.totalIncome) * 100).toFixed(2))
        : 0,
    percentageByCount:
      overallSummary.totalPayments > 0
        ? Number(
            ((row.totalPayments / overallSummary.totalPayments) * 100).toFixed(
              2
            )
          )
        : 0,
  }));

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription income by category fetched successfully',
    data: {
      summary: overallSummary,
      overallCategoryWise,
      monthWise,
    },
  });
});

// ─── Manager KPI ────────────────────────────────────────────────────────────
export const getManagerPaymentKPI = catchAsycn(async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const [monthlyIncomeAgg, activeEvents, activeLeagueIds, activeAmericanoLeagueIds] =
    await Promise.all([
      Payment.aggregate([
        {
          $match: {
            status: 'success',
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalMonthlyIncome: { $sum: '$amount' },
            totalPayments: { $sum: 1 },
          },
        },
      ]),
      Event.countDocuments({
        status: 'approved',
        endDate: { $gte: now },
      }),
      Match.distinct('league', { matchStatus: { $ne: 'completed' } }),
      AmericanoMatch.distinct('league', { matchStatus: { $ne: 'completed' } }),
    ]);

  const [activePublicLeagues, activePrivateLeagues, activeAmericanoLeagues] =
    await Promise.all([
      League.countDocuments({
        _id: { $in: activeLeagueIds },
        leagueType: 'public',
      }),
      League.countDocuments({
        _id: { $in: activeLeagueIds },
        leagueType: 'private',
      }),
      AmericanoLeague.countDocuments({
        _id: { $in: activeAmericanoLeagueIds },
      }),
    ]);

  const summary = monthlyIncomeAgg[0] || {
    totalMonthlyIncome: 0,
    totalPayments: 0,
  };

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Manager KPI fetched successfully',
    data: {
      totalMonthlyIncome: summary.totalMonthlyIncome,
      totalMonthlyPayments: summary.totalPayments,
      activeEvents,
      activePublicLeagues,
      activePrivateAndAmericanoLeagues: activePrivateLeagues + activeAmericanoLeagues,
      breakdown: {
        activePrivateLeagues,
        activeAmericanoLeagues,
      },
    },
  });
});

// ─── Check User Subscription Active Status Using Token ─────────────────────
export const checkUserSubscriptionStatus = catchAsycn(async (req, res) => {
  const userId = req.user?.id || req.user?._id;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  // Find the latest active subscription for the user
  const subscription = await Payment.findOne({
    userId,
    type: 'subscription',
    status: 'success',
  })
    .sort({ createdAt: -1 })
    .lean();

  let isSubscriptionActive = false;

  if (subscription) {
    // Check if subscription is still valid (within expiry date)
    const expiryDate = subscription.expiryDate as Date;
    isSubscriptionActive = expiryDate > new Date();
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: isSubscriptionActive
      ? 'User has active subscription'
      : 'User does not have active subscription',
    data:{
      isActive: isSubscriptionActive,
    }
  });
});

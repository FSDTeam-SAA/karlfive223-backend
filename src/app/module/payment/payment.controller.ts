import Stripe from 'stripe';
import AppError from '../../error/appError';
import catchAsycn from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendRespopnse';
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
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
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
  const { paymentIntentId } = req.body;

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

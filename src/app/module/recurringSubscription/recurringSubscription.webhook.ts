import Stripe from 'stripe';
import AppError from '../../error/appError';
import {
    handleInvoicePaidWebhook,
    handleInvoicePaymentFailedWebhook,
    handleSubscriptionDeletedWebhook,
} from './recurringSubscription.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

// ─── Handle Stripe Webhook ────────────────────────────────────────────────
export const handleRecurringSubscriptionWebhook = async (
  body: Buffer,
  signature: string
) => {
  const webhookSecret = process.env.STRIPE_RECURRING_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError(
      500,
      'STRIPE_RECURRING_WEBHOOK_SECRET not configured'
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    throw new AppError(400, `Webhook Error: ${error.message}`);
  }

  // Handle different event types
  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaidWebhook(event);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailedWebhook(event);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeletedWebhook(event);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return { received: true };
};

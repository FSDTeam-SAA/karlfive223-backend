import Stripe from 'stripe';
import AppError from '../../error/appError';
import {
    handleInvoicePaidWebhook,
    handleInvoicePaymentFailedWebhook,
    handleSubscriptionDeletedWebhook,
    handleSubscriptionUpdatedWebhook,
} from './recurringSubscription.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

// ─── Handle Stripe Webhook ────────────────────────────────────────────────
export const handleRecurringSubscriptionWebhook = async (
  body: Buffer,
  signature: string
) => {
  // Reuse the existing Stripe webhook secret when a dedicated one for this
  // route hasn't been provisioned yet, per "use the existing Stripe
  // configuration and environment variables". If the Stripe Dashboard
  // endpoint for this route is registered separately, set
  // STRIPE_RECURRING_WEBHOOK_SECRET to its own signing secret instead.
  const webhookSecret =
    process.env.STRIPE_RECURRING_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError(
      500,
      'STRIPE_RECURRING_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET) not configured'
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
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdatedWebhook(event);
      break;
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

# Auto-Subscription System - Implementation Guide

## 📋 Overview

The **Auto-Subscription Module** is a separate payment system that handles **recurring monthly charges** for subscription plans. It operates independently from the existing one-time payment system and uses Stripe's **Subscription API** instead of PaymentIntent.

### Key Features
✅ Monthly automatic billing  
✅ Payment failure handling & retries  
✅ Flexible plan management  
✅ Payment method updates  
✅ Webhook-based event processing  
✅ Detailed failure tracking  

---

## 🏗️ Architecture

### Database Schema (AutoSubscription Model)

```typescript
{
  userId: ObjectId,                    // User making the subscription
  plan: 'basic' | 'gold' | 'club',    // Subscription tier
  status: 'active' | 'canceled' | 'failed' | 'suspended',
  
  // Stripe identifiers
  stripeSubscriptionId: string,        // Stripe subscription ID
  stripeCustomerId: string,            // Stripe customer ID
  stripePriceId: string,               // Stripe price ID (e.g., price_gold_monthly)
  
  // Billing cycle tracking
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  nextBillingDate: Date,
  
  // Failure tracking
  failureCount: number,                // Number of failed payment attempts
  lastFailureReason: string,
  lastFailureAt: Date,
  
  // Payment method
  paymentMethodId: string,             // Stripe payment method ID
  last4Digits: string,                 // Card last 4 digits
  cardBrand: string,                   // Visa, Mastercard, etc.
  
  // Configuration
  autoRenewEnabled: boolean,
  startDate: Date,
  canceledAt?: Date,
  cancelReason?: string,
}
```

### Pricing

| Plan | Price | Max Join | Max Create | Organizer |
|------|-------|----------|------------|-----------|
| Basic | $5.44/mo | 10 | 5 | ❌ |
| Gold | $13.42/mo | 20 | 10 | ❌ |
| Club | $33.58/mo | ∞ | ∞ | ✅ |

---

## 🔧 Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
# Stripe Keys (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxx

# For development, use test keys:
# STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxx
# STRIPE_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxxxxxxxxxxx
```

### 2. Create Stripe Price IDs

In your Stripe Dashboard:

1. Go to **Products** → Create Product or select existing "Subscriptions" product
2. Create three prices with these IDs (or use auto-generated IDs and update code):
   - **price_basic_monthly**: $5.44, recurring monthly
   - **price_gold_monthly**: $13.42, recurring monthly
   - **price_club_monthly**: $33.58, recurring monthly

> **Note**: If Stripe auto-generates different IDs, update the `stripePriceId` format in `autoSubscription.service.ts` line 112.

### 3. Register Webhook

In Stripe Dashboard:

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://yourdomain.com/api/v1/auto-subscription/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the **Signing Secret** and set it as `STRIPE_WEBHOOK_SECRET`

### 4. Frontend Integration

Your frontend needs to:

1. **Create Stripe Payment Method** using Stripe.js:
   ```javascript
   const { paymentMethod } = await stripe.createPaymentMethod({
     type: 'card',
     card: cardElement,
     billing_details: { email: user.email }
   });
   ```

2. **Call Enable Endpoint**:
   ```javascript
   POST /api/v1/auto-subscription/enable
   {
     "userId": "user_id",
     "plan": "gold",
     "paymentMethodId": "pm_1234567890abcdefghijklmn"
   }
   ```

3. **Show Confirmation**: Display success message with next billing date

---

## 🔌 API Endpoints

### Public Endpoints

#### Get Plans Info
```http
GET /api/v1/auto-subscription/plans
```
Returns available subscription plans with pricing.

#### Stripe Webhook
```http
POST /api/v1/auto-subscription/webhook
```
Processes Stripe events (requires `stripe-signature` header).

---

### User Endpoints

#### Enable Auto-Subscription
```http
POST /api/v1/auto-subscription/enable
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "plan": "gold",
  "paymentMethodId": "pm_1234567890abcdefghijklmn"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-subscription created successfully",
  "data": {
    "subscriptionId": "sub_1234567890abcdefghijklmn",
    "status": "active",
    "nextBilling": "2025-05-16T10:30:00Z",
    "plan": "gold",
    "amount": 13.42
  }
}
```

**Errors:**
- `400`: Invalid plan or missing fields
- `404`: User not found
- `500`: Stripe API error

---

#### Get Subscription Status
```http
GET /api/v1/auto-subscription/status/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f...",
    "userId": "507f...",
    "plan": "gold",
    "status": "active",
    "nextBillingDate": "2025-05-16T10:30:00Z",
    "cardBrand": "visa",
    "last4Digits": "4242",
    "isActive": true
  }
}
```

---

#### Cancel Auto-Subscription
```http
POST /api/v1/auto-subscription/cancel
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "reason": "Too expensive"
}
```

**Note**: User will NOT be charged after cancellation.

---

#### Update Payment Method
```http
POST /api/v1/auto-subscription/update-payment-method
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "paymentMethodId": "pm_9876543210zyxwvutsrqponm"
}
```

---

#### Get Subscription History
```http
GET /api/v1/auto-subscription/history/:userId
```

Returns all auto-subscriptions (active and past) for the user.

---

### Admin Endpoints

#### Get All Auto-Subscriptions
```http
GET /api/v1/auto-subscription/all
Authorization: Bearer <admin_jwt_token>
```

Returns all auto-subscriptions across all users.

---

#### Retry Failed Payment
```http
POST /api/v1/auto-subscription/admin/retry-payment/:subscriptionId
Authorization: Bearer <admin_jwt_token>
```

Admin can manually trigger payment retry for failed subscriptions.

---

## 🔄 Webhook Events Flow

### Payment Successful
```
invoice.paid
  ↓
failureCount = 0
status = 'active'
```

### Payment Failed
```
invoice.payment_failed
  ↓
failureCount += 1
  ↓
failureCount > 3?
  ├─ YES: status = 'failed' (subscription stops)
  └─ NO: status = 'suspended' (Stripe retries)
```

### Subscription Updated
```
customer.subscription.updated
  ↓
Update currentPeriodStart/End
```

### Subscription Deleted
```
customer.subscription.deleted
  ↓
status = 'canceled'
```

---

## 🔐 User Data Flow on Subscription

When a user enables auto-subscription:

```
AutoSubscription Created
  ↓
User Model Updated:
  ├─ isOrganizer = true (if Club plan)
  ├─ leaguesCreatedCount = 0 (reset)
  ├─ leaguesJoinedCount = 0 (reset)
  └─ stripeCustomerId = cus_xxx
```

When subscription is canceled:

```
AutoSubscription Canceled
  ↓
User Model Updated:
  └─ isOrganizer = false (if was Club plan)
```

---

## 📊 Database Queries

### Find Active Subscription for User
```javascript
const active = await AutoSubscription.findOne({
  userId: userId,
  status: 'active'
});
```

### Find Failed Subscriptions
```javascript
const failed = await AutoSubscription.find({
  status: { $in: ['failed', 'suspended'] }
});
```

### Revenue This Month
```javascript
const revenue = await AutoSubscription.aggregate([
  {
    $match: {
      status: 'active',
      currentPeriodStart: { $gte: startOfMonth }
    }
  },
  {
    $group: {
      _id: '$plan',
      total: { $sum: '$amount' },
      count: { $sum: 1 }
    }
  }
]);
```

---

## ⚠️ Important Notes

### Price IDs Format
If Stripe generates different price IDs, update `autoSubscription.service.ts` line 112:
```typescript
const stripePriceId = `price_${plan}_monthly`; // Change this pattern
```

### Webhook Security
- Always verify `stripe-signature` header
- Webhook endpoint must be accessible from internet (not localhost)
- Test locally using Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:5000/api/v1/auto-subscription/webhook
  ```

### Payment Retry Logic
- Stripe automatically retries failed payments for 3-4 days
- After 4 days, the subscription is canceled
- Admin can manually retry via `/admin/retry-payment/:subscriptionId`

### User Cancellation
- When user cancels, Stripe subscription is deleted immediately
- User won't be charged on next billing date
- No refunds for partial month (contact support flow needed)

---

## 🚀 Testing

### Test Plan: Enable → Pay → Verify

```bash
# 1. Create Stripe test customer with payment method
curl -X POST https://api.stripe.com/v1/customers \
  -u sk_test_xxx: \
  -d "email=test@example.com"

# 2. Enable auto-subscription
curl -X POST http://localhost:5000/api/v1/auto-subscription/enable \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "plan": "gold",
    "paymentMethodId": "pm_card_visa"
  }'

# 3. Check status
curl http://localhost:5000/api/v1/auto-subscription/status/507f1f77bcf86cd799439011

# 4. Simulate webhook
stripe trigger invoice.paid
```

---

## 🔍 Debugging

### Check Subscription Status in DB
```javascript
db.autosubscriptions.findOne({ userId: ObjectId("...") })
```

### View Stripe Logs
- Stripe Dashboard → Developers → Logs
- Filter by subscription ID or customer ID

### Check Webhook Delivery
- Stripe Dashboard → Developers → Webhooks → Select endpoint → View events

---

## 📝 Related Files

- **Model**: [`autoSubscription.model.ts`](./autoSubscription.model.ts)
- **Interface**: [`autoSubscription.interface.ts`](./autoSubscription.interface.ts)
- **Service**: [`autoSubscription.service.ts`](./autoSubscription.service.ts)
- **Controller**: [`autoSubscription.controller.ts`](./autoSubscription.controller.ts)
- **Routes**: [`autoSubscription.route.ts`](./autoSubscription.route.ts)
- **Validation**: [`autoSubscription.validation.ts`](./autoSubscription.validation.ts)

---

## ✅ Checklist for Production

- [ ] Stripe live keys in `.env`
- [ ] Webhook endpoint registered in Stripe Dashboard
- [ ] All 3 price IDs created in Stripe
- [ ] Price ID format matches code (line 112 in service)
- [ ] Webhook secret configured
- [ ] HTTPS enabled on production server
- [ ] User model has `stripeCustomerId` field
- [ ] Routes registered in main `routes.ts`
- [ ] App.ts configured for raw body webhook parsing
- [ ] Test end-to-end flow with real payment method
- [ ] Error monitoring configured (Sentry, etc.)

---

## 🐛 Common Issues

### "Webhook signature verification failed"
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook event is coming from Stripe (not manual POST)
- Verify `stripe-signature` header is present

### "Price ID not found in Stripe"
- Verify price IDs exist in Stripe Dashboard
- Check format matches (should be `price_basic_monthly`, etc.)
- Create manually if auto-generation doesn't work

### "Payment succeeded but no webhook received"
- Webhook might be delayed (up to 5 minutes)
- Check Stripe Dashboard → Webhooks → Event delivery
- Test with Stripe CLI

### "User already has active subscription"
- Must cancel existing subscription before creating new one
- Check AutoSubscription collection for active records

---

## 📞 Support

For issues:
1. Check Stripe Dashboard logs
2. Review webhook delivery status
3. Verify all environment variables
4. Test with Stripe CLI locally
5. Check MongoDB records


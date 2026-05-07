# Recurring Subscription (Using Payment Intents + Bottom Sheet)

## 🎯 Overview

This new recurring subscription system uses **your existing payment flow** (payment intents + bottom sheet) to charge users monthly. 

**Key Differences:**
| Feature | Old Payment | Auto-Subscription | Recurring-Subscription |
|---------|-------------|-------------------|----------------------|
| **Flow** | One-time payment | Checkout redirect | Bottom sheet (existing) |
| **Saved Card** | No | No | ✅ Yes |
| **Auto-charge** | No | ✅ Monthly | ✅ Monthly |
| **Backend** | Simple | Webhook-based | Webhook-based |
| **UX** | Bottom sheet | Web redirect | ✅ In-app bottom sheet |

---

## 🔄 How It Works

### Step 1: Create Payment Intent (with card saving)
Frontend calls: `POST /api/v1/recurring-subscription/create-payment`

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "plan": "gold",
  "amount": 13.42
}
```

Backend:
- Gets/creates Stripe customer
- Creates payment intent with **`setup_future_usage: 'off_session'`** (saves card)
- Returns `clientSecret` for payment bottom sheet

### Step 2: User Enters Card (using existing bottom sheet)
- Display your existing payment bottom sheet
- User enters card using `clientSecret`
- Bottom sheet confirms payment

### Step 3: Confirm Payment & Create Subscription
Frontend calls: `POST /api/v1/recurring-subscription/confirm-payment`

```json
{
  "paymentIntentId": "pi_xxx",
  "paymentMethodId": "pm_xxx"
}
```

Backend:
- Verifies payment succeeded
- Creates Stripe Subscription (recurring)
- Saves `paymentMethodId` for future charges
- Activates recurring billing

### Step 4: Auto-charge Every Month
Stripe automatically charges card on:
- Day 30 of first month
- Every month after (same day)

Backend receives webhook:
- `invoice.paid` → Update billing period, keep active
- `invoice.payment_failed` → Track failures, suspend after 3
- `customer.subscription.deleted` → Mark as canceled

---

## 📋 API Endpoints

### 1. Create Payment Intent
```http
POST /api/v1/recurring-subscription/create-payment

{
  "userId": "507f1f77bcf86cd799439011",
  "plan": "gold",
  "amount": 13.42
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment intent created for recurring subscription",
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx",
    "plan": "gold",
    "amount": 13.42
  }
}
```

---

### 2. Confirm Payment & Activate Subscription
```http
POST /api/v1/recurring-subscription/confirm-payment

{
  "paymentIntentId": "pi_xxx",
  "paymentMethodId": "pm_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription confirmed and activated",
  "data": {
    "subscriptionId": "sub_xxx",
    "plan": "gold",
    "status": "active",
    "nextBillingDate": "2026-05-16T00:00:00Z",
    "amount": 13.42
  }
}
```

---

### 3. Get Subscription Status
```http
GET /api/v1/recurring-subscription/status/:userId
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription found",
  "data": {
    "userId": "507f...",
    "plan": "gold",
    "status": "active",
    "isActive": true,
    "nextBillingDate": "2026-05-16T00:00:00Z",
    "amount": 13.42,
    "failureCount": 0
  }
}
```

---

### 4. Get Subscription History
```http
GET /api/v1/recurring-subscription/history/:userId
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription history fetched",
  "data": [
    {
      "subscriptionId": "sub_xxx",
      "plan": "gold",
      "status": "active",
      "amount": 13.42,
      "startDate": "2026-04-16T10:30:00Z",
      "endDate": "2026-05-16T10:30:00Z",
      "canceledAt": null,
      "cancelReason": null
    }
  ]
}
```

---

### 5. Cancel Subscription
```http
POST /api/v1/recurring-subscription/cancel

{
  "userId": "507f1f77bcf86cd799439011",
  "reason": "No longer needed"
}
```

---

### 6. Get Plans
```http
GET /api/v1/recurring-subscription/plans
```

---

## 🔧 Environment Setup

Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_RECURRING_WEBHOOK_SECRET=whsec_test_xxxxx
STRIPE_PRICE_ID_BASIC=price_xxxxx
STRIPE_PRICE_ID_GOLD=price_xxxxx
STRIPE_PRICE_ID_CLUB=price_xxxxx
FRONTEND_URL=https://yourdomain.com
```

**Important:** Use your existing price IDs from Stripe Dashboard for each plan.

---

## 🪝 Stripe Webhook Setup

### 1. Register Webhook in Stripe Dashboard
- Endpoint: `https://yourdomain.com/api/v1/recurring-subscription/webhook`
- Events needed:
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`

### 2. Save Webhook Secret
- Copy webhook secret from Stripe Dashboard
- Add to `.env` as `STRIPE_RECURRING_WEBHOOK_SECRET`

---

## 📱 Frontend Implementation

### Using Existing Payment Bottom Sheet

```javascript
// 1. Create payment intent
async function startRecurringSubscription(userId, plan) {
  const response = await fetch('/api/v1/recurring-subscription/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      plan,
      amount: getPlanPrice(plan) // Get price for plan
    })
  });

  const { data } = await response.json();
  return data; // { clientSecret, paymentIntentId, plan, amount }
}

// 2. Show your existing payment bottom sheet with clientSecret
function showPaymentSheet(clientSecret, plan) {
  // Use your existing bottom sheet component
  // Pass clientSecret to initialize payment
  
  return new Promise((resolve, reject) => {
    // After user enters card and pays:
    // Get paymentMethodId from payment intent
    
    confirmPayment({
      paymentIntentId: "pi_xxx",
      paymentMethodId: "pm_xxx"
    });
  });
}

// 3. Confirm payment
async function confirmPayment(paymentIntentId, paymentMethodId) {
  const response = await fetch('/api/v1/recurring-subscription/confirm-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentIntentId,
      paymentMethodId
    })
  });

  if (!response.ok) {
    console.error('Subscription confirmation failed');
    return false;
  }

  const { data } = await response.json();
  console.log('Subscription activated!', data);
  return true;
}

// 4. Check subscription status
async function checkSubscriptionStatus(userId) {
  const response = await fetch(`/api/v1/recurring-subscription/status/${userId}`);
  const { data } = await response.json();
  
  if (data?.isActive) {
    console.log('User has active subscription!');
    console.log('Next billing date:', data.nextBillingDate);
  }
}
```

---

## 🧪 Testing

### Test Cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Expiry: `12/25`
- CVC: `123`

### Test Flow:
1. Call `/create-payment` with test userId
2. Get `clientSecret` from response
3. Use your existing payment bottom sheet with that clientSecret
4. When payment succeeds, extract `paymentMethodId`
5. Call `/confirm-payment` with both IDs
6. Verify subscription status with `/status/:userId`

### Test Webhook (Local):
```bash
stripe listen --forward-to localhost:5000/api/v1/recurring-subscription/webhook
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

---

## 📊 Database Schema

```typescript
interface IRecurringSubscription {
  userId: ObjectId;
  plan: 'basic' | 'gold' | 'club';
  status: 'pending' | 'active' | 'failed' | 'canceled' | 'past_due';
  
  stripeCustomerId: string;
  stripePaymentMethodId: string;      // Card ID saved
  stripeSubscriptionId: string;       // Recurring subscription ID
  
  amount: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  
  initialPaymentIntentId: string;
  
  failureCount: number;               // Tracks payment failures
  lastFailureDate: Date;
  lastFailureReason: string;
  
  canceledAt: Date;
  cancelReason: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔄 Subscription States

| Status | Meaning |
|--------|---------|
| `pending` | Payment intent created, waiting for payment |
| `active` | ✅ Paid, charging monthly |
| `past_due` | ⚠️ Payment failed once or twice, retrying |
| `failed` | ❌ 3 payment failures, subscription suspended |
| `canceled` | 🛑 User canceled |

---

## 🆚 Comparison With Other Systems

### vs Old Payment System
- **Old**: One-time charge, payment intent, no recurring
- **New**: Same payment flow + auto-recurring via Stripe Subscription

### vs Auto-Subscription (Checkout)
- **Auto-Sub**: Redirect to Stripe Checkout
- **Recurring**: Stays in your app (bottom sheet)

### vs Old Subscription (free/basic/gold/club)
- **Old**: Manual 30-day expiry
- **New**: Automatic monthly billing via Stripe

---

## ✅ Checklist

- [ ] Add `STRIPE_RECURRING_WEBHOOK_SECRET` to `.env`
- [ ] Register webhook in Stripe Dashboard
- [ ] Get webhook secret and add to `.env`
- [ ] Frontend code updated to use new endpoints
- [ ] Test with Stripe test cards locally
- [ ] Verify webhook delivery in Stripe Dashboard
- [ ] Deploy and test in production
- [ ] Monitor subscription creation and billing

---

## 🐛 Troubleshooting

**"Payment intent creation fails"**
- Check `STRIPE_SECRET_KEY` is correct
- Verify user exists in database
- Check plan is valid ('basic', 'gold', or 'club')

**"Confirm payment fails"**
- Verify `paymentIntentId` and `paymentMethodId` are correct
- Check payment intent exists and is succeeded
- Look in MongoDB for RecurringSubscription record

**"Webhook not received"**
- Verify webhook registered in Stripe Dashboard
- Check webhook secret in `.env`
- Test with Stripe CLI locally
- Verify HTTPS on production

**"Payment method not saved"**
- Ensure `setup_future_usage: 'off_session'` in payment intent ✅ (done)
- Check `paymentMethodId` is passed to confirm endpoint
- Verify in Stripe Dashboard that payment method was attached

**"Monthly charge not happening"**
- Check Stripe Subscription was created in Stripe Dashboard
- Verify subscription status is "active"
- Check billing cycle dates
- Look for failed invoices in Stripe Dashboard

---

## 📞 Support

1. Check Stripe Dashboard → Events for webhook events
2. Check Stripe Dashboard → Subscriptions for subscription status
3. Check MongoDB for RecurringSubscription records
4. Verify webhook delivery status in Stripe Dashboard
5. Check application logs for errors
6. Test locally with Stripe CLI

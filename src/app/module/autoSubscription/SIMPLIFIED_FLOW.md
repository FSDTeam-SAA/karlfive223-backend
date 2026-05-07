# Simplified Auto-Subscription Flow

## 🎯 Overview

**Three-step process:**
1. **Backend creates checkout link** → Frontend displays to user
2. **User pays via Stripe** → Redirected back to your app
3. **Frontend confirms payment** → Backend enables subscription

No webhooks needed. Everything is handled manually and instantly.

---

## 🚀 API Endpoints

### 1. Create Checkout Session
```http
POST /api/v1/auto-subscription/create-checkout
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "plan": "gold"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Checkout session created. Send this link to user.",
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_...",
    "sessionId": "cs_...",
    "plan": "gold",
    "amount": 13.42
  }
}
```

**Frontend Action:**
- Redirect user to `checkoutUrl`
- User completes payment on Stripe
- Stripe redirects to `FRONTEND_URL/subscription/success?session_id=cs_...`

---

### 2. Confirm Payment
```http
POST /api/v1/auto-subscription/confirm-payment
Content-Type: application/json

{
  "sessionId": "cs_123456789..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment confirmed and subscription activated",
  "data": {
    "subscriptionId": "sub_...",
    "plan": "gold",
    "status": "active",
    "nextBillingDate": "2025-05-16T10:30:00Z"
  }
}
```

**Frontend Action:**
- Extract `session_id` from redirect URL
- Call confirm-payment endpoint
- On success: show "Subscription activated!"
- Store subscription status locally or fetch it again

---

### 3. Get Subscription Status
```http
GET /api/v1/auto-subscription/status/:userId
```

**Response (After Payment):**
```json
{
  "success": true,
  "data": {
    "userId": "507f...",
    "plan": "gold",
    "status": "active",
    "nextBillingDate": "2025-05-16T10:30:00Z",
    "amount": 13.42,
    "isActive": true
  }
}
```

---

### 4. Cancel Subscription
```http
POST /api/v1/auto-subscription/cancel
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "reason": "No longer needed"
}
```

---

### 5. Get Plans
```http
GET /api/v1/auto-subscription/plans
```

---

## 🔧 Environment Setup

### Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PRICE_ID_BASIC=price_basic_monthly
STRIPE_PRICE_ID_GOLD=price_gold_monthly
STRIPE_PRICE_ID_CLUB=price_club_monthly
FRONTEND_URL=https://yourdomain.com
```

Note: No `STRIPE_WEBHOOK_SECRET` needed anymore!

---

## ⚙️ Stripe Setup

### 1. Create Price IDs
In Stripe Dashboard → Products:
- Create 3 prices with recurring monthly billing
- Get the price IDs: `price_xxx_xxx`

### 2. Set Success/Cancel URLs
In Stripe Dashboard → Products → Prices:
- Success: `https://yourdomain.com/subscription/success`
- Cancel: `https://yourdomain.com/subscription/cancel`

No webhook registration needed!

---

## 📊 Flow Diagram

```
User clicks "Subscribe to Gold"
    ↓
Frontend: POST /create-checkout
    ↓
Backend returns { checkoutUrl, sessionId }
    ↓
Frontend redirects to checkoutUrl
    ↓
User pays on Stripe Checkout
    ↓
Stripe redirects to success page with session_id in URL
    ↓
Frontend extracts session_id and calls: POST /confirm-payment
    ↓
Backend verifies session is paid
    ↓
Backend activates subscription in database
    ↓
Return subscription details to frontend
    ↓
User has active subscription ✅
```

---

## 📝 Frontend Implementation Example

```javascript
// Step 1: Create checkout session
async function startSubscription(userId, plan) {
  const response = await fetch('/api/v1/auto-subscription/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ userId, plan })
  });
  
  const { data } = await response.json();
  window.location.href = data.checkoutUrl; // Redirect to Stripe
}

// Step 2: Handle redirect back
function handleSubscriptionSuccess() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  
  if (!sessionId) {
    console.error('No session_id in URL');
    return;
  }
  
  // Confirm payment
  confirmPayment(sessionId);
}

// Step 3: Confirm payment
async function confirmPayment(sessionId) {
  const response = await fetch('/api/v1/auto-subscription/confirm-payment', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });
  
  if (!response.ok) {
    console.error('Payment confirmation failed');
    return;
  }
  
  const { data } = await response.json();
  console.log('Subscription activated!', data);
  // Show success message and redirect to dashboard
}
```

---

## 🧪 Testing

### Test Card Numbers:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- Exp: 12/25, CVC: 123

### Manual Test Flow:
1. Call `/create-checkout` with test userId
2. Get `checkoutUrl` from response
3. Visit that URL in browser
4. Fill form with test card 4242 4242 4242 4242
5. Click Pay
6. You'll be redirected to success page
7. Call `/confirm-payment` with sessionId from URL
8. Subscription should be active

---

## ✅ Checklist

- [ ] `.env` has all 4 Stripe variables (no webhook secret needed!)
- [ ] 3 price IDs created in Stripe Dashboard
- [ ] Success/Cancel URLs set in Stripe (optional but good practice)
- [ ] `FRONTEND_URL` set correctly
- [ ] Frontend code handles redirect and calls confirm-payment
- [ ] User model has `stripeCustomerId` field
- [ ] Routes registered in main router
- [ ] HTTPS enabled on production

---

## 🐛 Troubleshooting

**"Checkout URL is null"**
- Verify `STRIPE_PRICE_ID_GOLD` etc in `.env`
- Check price IDs exist in Stripe Dashboard
- Ensure Stripe keys are correct

**"Confirm payment fails"**
- Check sessionId is passed correctly
- Verify session exists and is paid in Stripe Dashboard
- Check MongoDB for pending subscription record

**"Session not found"**
- Make sure checkout was created with this sessionId
- Session expires after 24 hours
- Create a new checkout session if needed

---

## 📞 Support

1. Check Stripe Dashboard → Events for checkout.session events
2. Check MongoDB for AutoSubscription records
3. Verify price IDs are correct in Stripe
4. Test with Stripe test cards locally
5. Check application logs for errors




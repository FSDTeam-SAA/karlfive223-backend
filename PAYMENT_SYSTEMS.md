# Three Payment Systems Comparison

You now have **3 separate payment systems**. Here's when to use each:

---

## 1️⃣ Old Payment System
**File:** `/src/app/module/payment/`
**Use Case:** One-time payments (league creation, team payments, etc.)

### How it works:
1. User creates payment intent
2. User pays via existing bottom sheet
3. Payment confirmed, league/team created

### Endpoints:
- `POST /api/v1/payment/create-payment` → One-time charge
- `POST /api/v1/payment/confirm-payment` → Confirm charge

**✅ Use this for:** Paying to join leagues, team payments, etc.

---

## 2️⃣ Auto-Subscription (Checkout Sessions)
**File:** `/src/app/module/autoSubscription/`
**Use Case:** Monthly auto-subscription via **web redirect**

### How it works:
1. Backend creates Stripe Checkout link
2. Frontend redirects user to Stripe
3. User pays on Stripe
4. User manually confirms payment via endpoint (no webhook)
5. Subscription activated

### Endpoints:
- `POST /api/v1/auto-subscription/create-checkout` → Get checkout URL
- `POST /api/v1/auto-subscription/confirm-payment` → Activate after payment

**✅ Use this if:**
- You want to use Stripe Checkout (web page)
- You don't want webhooks
- You don't need card saving

---

## 3️⃣ Recurring Subscription (NEW - Payment Intents)
**File:** `/src/app/module/recurringSubscription/`
**Use Case:** Monthly auto-subscription using **bottom sheet + webhooks** ⭐ RECOMMENDED

### How it works:
1. Backend creates payment intent with card saving
2. User pays via **your existing bottom sheet**
3. Card automatically saved
4. Subscription created in Stripe
5. **Auto-charges every month**
6. Webhooks handle monthly billing

### Endpoints:
- `POST /api/v1/recurring-subscription/create-payment` → Payment intent
- `POST /api/v1/recurring-subscription/confirm-payment` → Create subscription
- Webhook: `/api/v1/recurring-subscription/webhook` → Handles monthly billing

**✅ Use this if:**
- ⭐ You want to use your existing bottom sheet (best UX)
- ⭐ You want automatic monthly billing
- You're okay with webhooks
- Users should stay in your app (no redirect)

---

## 🎯 Decision Tree

```
Do you need monthly auto-billing?
├─ No → Use OLD PAYMENT SYSTEM (one-time payments)
└─ Yes → 
    Do you want users to stay in your app?
    ├─ No (redirect to web) → Use AUTO-SUBSCRIPTION (Checkout)
    └─ Yes (use bottom sheet) → Use RECURRING SUBSCRIPTION ⭐
```

---

## 📊 Quick Comparison

| Feature | Old Payment | Auto-Subscription | Recurring ⭐ |
|---------|-------------|-------------------|-----------|
| **Flow** | Bottom sheet | Web redirect | Bottom sheet |
| **Type** | One-time | Monthly recurring | Monthly recurring |
| **Card Saved** | ❌ No | ❌ No | ✅ Yes |
| **Auto-charge** | ❌ No | ✅ Yes | ✅ Yes |
| **Webhook** | ❌ No | ❌ No | ✅ Yes |
| **Price IDs** | ❌ Not needed | ✅ Required | ❌ Not needed |
| **UX** | In-app | Redirects away | In-app |
| **User stays in app** | ✅ Yes | ❌ No | ✅ Yes |
| **Manual confirmation** | No | Yes | No (auto) |

---

## 🔧 Environment Setup

### Old Payment (no extra config needed)
```env
STRIPE_SECRET_KEY=sk_test_xxx
```

### Auto-Subscription
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_ID_BASIC=price_xxx
STRIPE_PRICE_ID_GOLD=price_xxx
STRIPE_PRICE_ID_CLUB=price_xxx
FRONTEND_URL=https://yourdomain.com
```

### Recurring Subscription ⭐ (RECOMMENDED)
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_RECURRING_WEBHOOK_SECRET=whsec_test_xxx
STRIPE_PRICE_ID_BASIC=price_xxx
STRIPE_PRICE_ID_GOLD=price_xxx
STRIPE_PRICE_ID_CLUB=price_xxx
FRONTEND_URL=https://yourdomain.com
```

**Recurring Subscription needs fewest env variables!**

---

## 🚀 Recommended Choice

**For best user experience: Use Recurring Subscription ⭐**

**Why:**
- ✅ Users don't leave your app (use existing bottom sheet)
- ✅ Cleanest implementation (payment intents like old system)
- ✅ Automatic monthly billing (true set-and-forget)
- ✅ Same payment method as old system (reuse your existing code)
- ✅ No price IDs needed (unlike Auto-Subscription)
- ✅ Webhooks handle everything (no manual confirmation)

---

## ❌ DO NOT

### Don't mix systems for same user
If user buys with **Old Payment**, don't also create **Recurring** or **Auto** subscription for them (avoid duplicate charges).

### Don't delete old payment module
Keep **Old Payment** module - still needed for:
- One-time league payments
- Team payments
- Other non-subscription charges

### Don't forget webhooks (for Recurring)
Register webhook in Stripe Dashboard for:
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

---

## 📝 Migration Guide (if switching)

If you already have users on **Old Subscription** (30-day manual):

1. **Keep old subscription records** (read-only)
2. **New users** → Use Recurring Subscription
3. **Existing users** → Can upgrade to Recurring when their 30 days expire
4. **No need to migrate** existing records (too complex)

---

## 💡 Examples

### Example 1: League Payment (One-time)
```
User pays $50 to create league
→ Use OLD PAYMENT SYSTEM
→ Payment processed, league created
→ No recurring charge
```

### Example 2: Monthly Subscription (Checkout Redirect)
```
User subscribes to Gold plan
→ User clicks "Subscribe"
→ Redirected to Stripe Checkout page (leaves app)
→ Pays on Stripe
→ Returns to app
→ Use AUTO-SUBSCRIPTION if preferred
```

### Example 3: Monthly Subscription (In-App) ⭐ RECOMMENDED
```
User subscribes to Gold plan
→ User clicks "Subscribe"
→ Bottom sheet opens in your app
→ User enters card
→ Subscription created, auto-charges monthly
→ Use RECURRING SUBSCRIPTION
→ Best user experience ✅
```

---

## 📞 Support

**Which system should I use?**
→ **Use Recurring Subscription** (number 3) for best UX

**Can I use multiple systems?**
→ Yes, but not for same user/plan

**Do I need all three?**
→ No, but keep Old Payment for non-subscription charges

**How do I test Recurring Subscription?**
→ See RECURRING_SUBSCRIPTION_GUIDE.md

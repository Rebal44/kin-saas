# Kin API

Base URL:

- Local: `http://localhost:3001`

This API is intentionally “loginless” for the MVP flow: Stripe checkout creates/identifies the user, and Telegram connects via a one-time token in the `/start` deep link.

---

## Stripe

### POST `/api/stripe/create-checkout-session`

Creates a Stripe Checkout session for the $29/month subscription.

Body:

```json
{ "email": "you@example.com" }
```

Response:

```json
{ "sessionId": "cs_...", "url": "https://checkout.stripe.com/..." }
```

---

### GET `/api/stripe/checkout-session?sessionId=cs_...`

Resolves a Stripe Checkout session to a Telegram connect link (and best-effort syncs the subscription immediately).

Response:

```json
{
  "email": "you@example.com",
  "customerId": "cus_...",
  "connectionId": "uuid-token",
  "botUsername": "YourBot",
  "deepLink": "https://t.me/YourBot?start=uuid-token"
}
```

---

### POST `/api/stripe/create-portal-session`

Creates a Stripe Customer Portal session from a checkout session id.

Body:

```json
{ "sessionId": "cs_..." }
```

Response:

```json
{ "url": "https://billing.stripe.com/session/..." }
```

---

### POST `/api/stripe/create-topup-session`

Creates a one-time Stripe Checkout session to buy more credits.

Body:

```json
{ "email": "you@example.com" }
```

Response:

```json
{ "sessionId": "cs_...", "url": "https://checkout.stripe.com/..." }
```

---

## Webhooks

### POST `/api/webhooks/stripe`

Stripe webhook endpoint (raw body). Configure this in Stripe Dashboard.

Required header:

- `stripe-signature`

Events handled:

- `checkout.session.completed`
  - subscription: creates user/subscription + grants monthly credits
  - top-up: adds credits
- `invoice.paid` (credits refill on renewals)
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`

Response:

```json
{ "received": true }
```

---

### POST `/api/webhooks/telegram`

Telegram bot webhook endpoint.

Optional required header (recommended):

- `x-telegram-bot-api-secret-token` (must equal `TELEGRAM_WEBHOOK_SECRET`)

Behavior:

- `/start <token>` links the Telegram chat to the user created at checkout.
- Other messages are billed (credits) and forwarded to Kimi (Moonshot).

Response: `200 OK`

---

## Health

### GET `/api/health`

Basic health endpoint.

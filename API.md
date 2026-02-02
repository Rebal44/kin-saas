# Kin SaaS API Documentation

## Base URL

- **Production:** `https://api.kin-saas.com`
- **Staging:** `https://api-staging.kin-saas.com`
- **Local:** `http://localhost:3001`

## Authentication

### Clerk Authentication

Most endpoints require Clerk authentication. Include the session token in the Authorization header:

```
Authorization: Bearer <clerk_session_token>
```

### API Key Authentication

Webhook endpoints use API key authentication:

```
X-API-Key: <webhook_secret>
```

## Endpoints

### Authentication

#### POST `/api/auth/webhook`

Handles Clerk webhooks for user lifecycle events.

**Headers:**
- `svix-id` - Webhook ID
- `svix-timestamp` - Timestamp
- `svix-signature` - Signature

**Body:** Clerk webhook payload

**Response:**
```json
{
  "received": true
}
```

---

### Stripe

#### POST `/api/stripe/create-checkout-session`

Creates a Stripe Checkout session for subscription.

**Auth:** Required

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

**Errors:**
- `400` - Already subscribed
- `404` - User not found
- `500` - Stripe error

---

#### POST `/api/stripe/create-portal-session`

Creates a Stripe Customer Portal session.

**Auth:** Required

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

---

#### GET `/api/stripe/subscription`

Gets current user's subscription status.

**Auth:** Required

**Response:**
```json
{
  "status": "active",
  "currentPeriodEnd": 1704067200,
  "cancelAtPeriodEnd": false,
  "priceId": "price_..."
}
```

---

#### POST `/api/stripe/cancel`

Cancels subscription at period end.

**Auth:** Required

**Response:**
```json
{
  "message": "Subscription will be canceled at the end of the billing period"
}
```

---

#### POST `/api/stripe/reactivate`

Reactivates a subscription scheduled for cancellation.

**Auth:** Required

**Response:**
```json
{
  "message": "Subscription reactivated"
}
```

---

#### POST `/api/stripe/webhook`

Handles Stripe webhooks.

**Headers:**
- `stripe-signature` - Stripe signature

**Body:** Stripe event payload

**Events Handled:**
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`

**Response:**
```json
{
  "received": true
}
```

---

### Bot Webhooks

#### POST `/api/bots/telegram/webhook`

Receives messages from Telegram.

**Headers:**
- `X-Telegram-Bot-Api-Secret-Token` - Secret token

**Body:** Telegram Update object

**Response:** `200 OK`

---

#### POST `/api/bots/whatsapp/webhook`

Receives messages from WhatsApp.

**Headers:**
- `X-WhatsApp-Webhook-Token` - Webhook token

**Body:** WhatsApp message payload

**Response:** `200 OK`

---

### User

#### GET `/api/user/me`

Get current user profile.

**Auth:** Required

**Response:**
```json
{
  "id": "user_...",
  "email": "user@example.com",
  "fullName": "John Doe",
  "subscriptionStatus": "active",
  "trialEndsAt": null,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

#### GET `/api/user/stats`

Get user usage statistics.

**Auth:** Required

**Response:**
```json
{
  "totalMessages": 150,
  "messagesThisMonth": 45,
  "subscriptionStatus": "active",
  "subscriptionEndsAt": "2024-12-31T00:00:00Z",
  "daysRemaining": 28
}
```

---

### Bot Connections

#### GET `/api/bots/connections`

List user's bot connections.

**Auth:** Required

**Response:**
```json
{
  "connections": [
    {
      "id": "conn_...",
      "platform": "telegram",
      "platformUserId": "123456789",
      "platformUsername": "@username",
      "isActive": true,
      "connectedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### DELETE `/api/bots/connections/:id`

Disconnect a bot.

**Auth:** Required

**Response:**
```json
{
  "message": "Bot disconnected"
}
```

---

### Conversations

#### GET `/api/conversations`

Get user's conversation history.

**Auth:** Required

**Query Parameters:**
- `limit` - Number of results (default: 20, max: 100)
- `cursor` - Pagination cursor

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv_...",
      "platform": "telegram",
      "message": "Hello!",
      "response": "Hi there! How can I help?",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "nextCursor": "..."
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden (subscription required) |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMITED` | Too many requests |
| `SUBSCRIPTION_REQUIRED` | Active subscription needed |
| `INVALID_REQUEST` | Invalid request body |
| `STRIPE_ERROR` | Payment processing error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| General API | 100 requests/minute |
| Auth endpoints | 5 requests/15 minutes |
| Webhooks | 1000 requests/minute |
| Bot messages | 60 messages/minute (free), 100 (pro) |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## Webhooks

### Outgoing Webhooks

Kin can send webhooks to your server for real-time events.

Configure webhook URL in dashboard: `https://kin-saas.com/dashboard/settings`

**Headers:**
```
X-Kin-Signature: <hmac_signature>
Content-Type: application/json
```

**Payload:**
```json
{
  "event": "subscription.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {}
}
```

**Events:**
- `subscription.created`
- `subscription.canceled`
- `subscription.trial_ending`
- `payment.succeeded`
- `payment.failed`
- `bot.connected`
- `bot.disconnected`

---

## SDK

### JavaScript/TypeScript

```bash
npm install @kin-saas/sdk
```

```typescript
import { KinClient } from '@kin-saas/sdk';

const client = new KinClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.kin-saas.com'
});

// Get user stats
const stats = await client.user.getStats();
console.log(stats.totalMessages);

// Create checkout session
const session = await client.stripe.createCheckoutSession();
window.location.href = session.url;
```

---

## Changelog

### v1.0.0
- Initial API release
- Stripe integration
- Bot webhooks
- User management

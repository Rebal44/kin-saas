# Deployment (Fast Launch Checklist)

This repo currently deploys as **two services**:

- **Website (Next.js):** `kin-saas/my-app`
- **API (Express):** `kin-backend`

The API handles Stripe + Telegram + database writes. The website is just the marketing + checkout + “connect Telegram” UI.

---

## 1) Create required accounts

- Supabase (Postgres)
- Stripe
- Telegram bot (via @BotFather)

---

## 2) Supabase setup

1. Create a new Supabase project
2. Apply migrations in `supabase/migrations/`
   - If using the CLI: link your project and run `supabase db push`
   - Or paste the SQL into Supabase SQL editor in order (001 → 003)
3. Copy these values (Project Settings → API):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 3) Stripe setup

1. Create a product + recurring price in Stripe:
   - Name: “Kin”
   - Price: **$29 / month**
   - Trial: **7 days**
2. Copy:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_TOPUP_PRICE_ID` (one‑time price for credits)

3. Create a **one‑time** product for credits (Top Up):
   - Example name: “Kin Credits”
   - Price: whatever you want (e.g. $10)
   - Copy the price id → `STRIPE_TOPUP_PRICE_ID`

3. Create a webhook endpoint pointing to your **API** domain:
   - URL: `https://YOUR_API_DOMAIN/api/webhooks/stripe`
   - Events:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.trial_will_end`
4. Copy the webhook signing secret:
   - `STRIPE_WEBHOOK_SECRET`

---

## 4) Telegram setup

1. Create a Telegram bot in @BotFather and copy:
   - `TELEGRAM_BOT_TOKEN`
2. (Optional) Set a webhook secret:
   - `TELEGRAM_WEBHOOK_SECRET` (any random string; can be left blank to simplify)
3. Set the webhook to your **API** domain:
   - URL: `https://YOUR_API_DOMAIN/api/webhooks/telegram`
   - If you set a secret, Telegram will send header `x-telegram-bot-api-secret-token` and it must match `TELEGRAM_WEBHOOK_SECRET`

The API also exposes `POST /api/webhooks/telegram/set-webhook` for convenience.

---

## 5) Deploy to Vercel (two projects)

If you’re not technical, follow this exactly. You’ll do this **twice** (one for Web, one for API).

### A) API project

1. Create a Vercel project with root directory `kin-backend`
   - Go to Vercel dashboard
   - Click **Add New…** → **Project**
   - Under **Import Git Repository**, pick this repo
   - In **Configure Project**:
     - Set **Root Directory** to `kin-backend`
     - Click **Deploy**
2. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID`
   - `STRIPE_TOPUP_PRICE_ID`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET` (optional; leave blank to simplify setup)
   - `FRONTEND_URL` (your web domain, e.g. `https://YOUR_WEB_DOMAIN`)
   - `KIN_AI_API_KEY` (required for real answers)
   - `KIN_AI_API_URL` (optional; default `https://api.moonshot.ai/v1`)
   - `KIN_AI_MODEL` (optional; default `kimi-k2.5`)
   - `MONTHLY_CREDITS` (optional; default 10000)
   - `CREDITS_PER_MESSAGE` (optional; default 1)
   - `TOPUP_CREDITS` (optional; default 5000)

Deploy and copy your API URL (e.g. `https://YOUR_API_DOMAIN`).

### B) Web project

1. Create a Vercel project with root directory `kin-saas/my-app`
   - Vercel dashboard → **Add New…** → **Project**
   - Import the same git repo again
   - In **Configure Project**:
     - Set **Root Directory** to `kin-saas/my-app`
     - Framework should show **Next.js**
     - Click **Deploy**
2. Set environment variables:
   - `NEXT_PUBLIC_APP_URL` (your web domain)
   - `NEXT_PUBLIC_API_URL` (your API domain)

Deploy and copy your web URL (e.g. `https://YOUR_WEB_DOMAIN`).

---

## 6) Final wiring

- In Stripe webhooks, confirm the endpoint points to the **API** domain.
- In Telegram webhook, confirm it points to the **API** domain.
- In the web project env vars, confirm `NEXT_PUBLIC_API_URL` is the **API** domain.

### Telegram webhook (easy way)

If you left `TELEGRAM_WEBHOOK_SECRET` blank, set the Telegram webhook by pasting this into your browser (replace values):

`https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook?url=https://YOUR_API_DOMAIN/api/webhooks/telegram`

---

## 7) Security note (important)

If you ever committed real Stripe keys / DB URLs into git, **rotate them**:

- Stripe: roll API keys / restricted keys and webhook secret
- Supabase: rotate database password / service role key if exposed

This repo had leaked example credentials earlier and they were scrubbed, but rotation is still recommended.

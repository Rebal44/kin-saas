# Deployment (Vercel + Supabase + Stripe + Telegram)

This project deploys as **one** Next.js app:

- **App (website + API routes):** `kin-saas/my-app`

Stripe + Telegram webhooks are handled by Next.js API routes in the same app.

---

## 1) Supabase (database)

1. Create a new Supabase project
2. Apply migrations in `supabase/migrations/`
   - Use Supabase SQL editor or the CLI (`supabase db push`)
3. Copy these values (Supabase → Project Settings → API):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 2) Stripe (payments)

1. Create a subscription product/price:
   - Name: `Kin`
   - Price: `$29 / month`
   - Trial: `7 days`
   - Copy the price id → `STRIPE_PRICE_ID`
2. Create a one‑time top‑up product/price (credits):
   - Example: `$10`
   - Copy the price id → `STRIPE_TOPUP_PRICE_ID`
3. Copy:
   - `STRIPE_SECRET_KEY`
4. Create a webhook endpoint (Stripe Dashboard → Developers → Webhooks):
   - Endpoint URL: `https://YOUR_DOMAIN/api/webhooks/stripe`
   - Events:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.trial_will_end`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 3) Telegram (bot)

1. Create a bot via `@BotFather`
2. Copy:
   - `TELEGRAM_BOT_TOKEN`
3. Optional (recommended): set a webhook secret:
   - `TELEGRAM_WEBHOOK_SECRET` (any random string)

---

## 4) Moonshot (Kimi) (AI)

Create an API key and copy:

- `MOONSHOT_API_KEY` (or `KIN_AI_API_KEY`)

Defaults used by the app:

- `KIN_AI_API_URL=https://api.moonshot.ai/v1`
- `KIN_AI_MODEL=kimi-k2.5`

---

## 5) Deploy to Vercel (one project)

1. Vercel Dashboard → **Add New…** → **Project**
2. Import your GitHub repo
3. In **Configure Project**:
   - **Root Directory**: `kin-saas/my-app`
   - Framework: **Next.js**
4. Add environment variables (Project → Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID`
   - `STRIPE_TOPUP_PRICE_ID`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET` (optional)
   - `MOONSHOT_API_KEY` (or `KIN_AI_API_KEY`)
   - `KIN_AI_API_URL` (optional)
   - `KIN_AI_MODEL` (optional)
   - `MONTHLY_CREDITS` (optional)
   - `CREDITS_PER_MESSAGE` (optional)
   - `TOPUP_CREDITS` (optional)
   - `NEXT_PUBLIC_APP_URL` (optional, but recommended: `https://YOUR_DOMAIN`)
5. Deploy

---

## 6) Set Telegram webhook (one click)

After your Vercel deployment is live, open:

- `https://YOUR_DOMAIN/api/webhooks/telegram/set-webhook`

To verify, open:

- `https://YOUR_DOMAIN/api/webhooks/telegram/webhook-info`

---

## 7) Optional: Enable OpenClaw gateway mode

If you run an OpenClaw Gateway separately, set these Vercel env vars:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`
- `OPENCLAW_AGENT_ID` (optional; default `main`)

When set, Kin routes Telegram messages through OpenClaw.

Setup guide: `OPENCLAW_GATEWAY.md`

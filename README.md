# Kin SaaS

A simple paid Telegram AI wrapper.

## What works now (intended flow)

1. User visits the website
2. User subscribes for $29/month (Stripe Checkout, 7‑day trial)
3. Success page shows a “Connect Telegram” link
4. User taps Start in Telegram and can immediately chat
5. If they run out of credits, they can top up at `/top-up`

## Repository layout (current source of truth)

- `kin-saas/my-app` — Next.js app (website + API routes)
- `supabase/migrations` — database migrations

`kin-backend/` and `kin/` are legacy/unused right now and should be treated as archival.

## Local development

Prereqs: Node.js 20+, Supabase project, Stripe account, Telegram bot.

1) Database (Supabase)

- Create a Supabase project
- Apply migrations in `supabase/migrations` (via Supabase CLI or SQL editor)

2) App (Next.js)

```bash
cd kin-saas/my-app
cp .env.example .env.local
npm install
npm run dev
```

## Deploy (fast path)

Create one Vercel project from this repo:

- Root Directory: `kin-saas/my-app`

Then set:

- Stripe webhook destination: `https://YOUR_DOMAIN/api/webhooks/stripe`
- Telegram webhook: open `https://YOUR_DOMAIN/api/webhooks/telegram/set-webhook`

See `DEPLOYMENT.md` for the full checklist.

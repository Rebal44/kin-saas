# Kin SaaS

A simple paid Telegram AI wrapper.

## What works now (intended flow)

1. User visits the website
2. User subscribes for $29/month (Stripe Checkout, 7‑day trial)
3. Success page shows a “Connect Telegram” link
4. User taps Start in Telegram and can immediately chat
5. If they run out of credits, they can top up at `/top-up`

## Repository layout (current source of truth)

- `kin-saas/my-app` — website (Next.js)
- `kin-backend` — API (Express): Stripe checkout + Stripe webhooks + Telegram webhook + credits
- `supabase/migrations` — database migrations

`kin/` is legacy/unused right now and should be treated as archival.

## Local development

Prereqs: Node.js 20+, Supabase project, Stripe account, Telegram bot.

1) Database (Supabase)

- Create a Supabase project
- Apply migrations in `supabase/migrations` (via Supabase CLI or SQL editor)

2) Backend API

```bash
cd kin-backend
cp .env.example .env
npm install
npm run dev
```

3) Website

```bash
cd kin-saas/my-app
cp .env.example .env.local
npm install
npm run dev
```

## Deploy (fast path)

Create two Vercel projects from the same repo:

- Web project root: `kin-saas/my-app`
- API project root: `kin-backend`

Then:

- Point your Telegram bot webhook to the API project: `POST /api/webhooks/telegram`
- Point Stripe webhooks to the API project: `POST /api/webhooks/stripe`
- Set the website env `NEXT_PUBLIC_API_URL` to your API project URL

See `DEPLOYMENT.md` for the full checklist.

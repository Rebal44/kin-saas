# Infrastructure (Current)

Kin runs as a simple stack:

- **Vercel**: one Next.js app (`kin-saas/my-app`)
  - Website pages
  - API routes for Stripe + Telegram + account/credits
- **Supabase (Postgres)**: users, subscriptions, connections, credits, message history
- **Stripe**: subscription + top‑ups + billing portal
- **Telegram**: bot + webhook into the Vercel app
- **AI provider**: Moonshot (Kimi) via `https://api.moonshot.ai/v1`
- **Optional**: OpenClaw Gateway (separate service) if you want OpenClaw agent runtime

See `DEPLOYMENT.md` for the click-by-click setup.


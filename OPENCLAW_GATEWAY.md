# OpenClaw Gateway (Optional)

Kin can run in two modes:

1. Default: Kin talks directly to Kimi (Moonshot) from the Kin backend.
2. Optional: Kin forwards messages to an **OpenClaw Gateway** (remote agent runtime) using OpenClaw's Chat Completions-compatible HTTP endpoint.

If you want "OpenClaw inside Kin", you must run **one OpenClaw Gateway server** somewhere (a VPS). Vercel cannot run OpenClaw.

## What you get (when OpenClaw is enabled)

- Kin website + Stripe + credits stays on Vercel.
- Telegram messages are forwarded to OpenClaw.
- OpenClaw can be configured to use Kimi 2.5 as its model provider.
- OpenClaw tools can be enabled/disabled on the Gateway (recommended: start restricted).

## Cheapest hosting reality

There is no "free forever and scales to millions" option for hosting OpenClaw.

To run OpenClaw for real users, you need always-on compute (a VPS). The cheapest practical options:

- Oracle Always Free (can be $0/mo, but signup/capacity can be finicky)
- A small paid VPS (usually $4-$6/mo). This is the most reliable path.

## Quick start (one Gateway for testing)

1. Create an Ubuntu 24.04 VPS (any provider).
2. SSH into it.
3. (Recommended) Point a subdomain to the VPS IP (DNS A record), e.g. `openclaw.yourdomain.com`.
4. Run this repo script on the VPS:

```bash
OPENCLAW_DOMAIN=openclaw.yourdomain.com \
  curl -fsSL https://raw.githubusercontent.com/Rebal44/kin-saas/main/scripts/openclaw-gateway/setup-ubuntu.sh | bash
```

At the end it prints:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`

4. In Vercel (Kin project) set these env vars:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`
- `OPENCLAW_AGENT_ID` (optional; default `main`)

5. Redeploy on Vercel.
6. Verify:

- `https://YOUR_DOMAIN/api/openclaw/health`

## Security defaults (important)

The setup script intentionally starts with a restricted tool policy:

- Allows: `web_fetch` (HTTP fetch and readable extraction)
- Denies: shell execution and filesystem modification tools

This is the baseline you want for SaaS users. If you later enable browser automation or exec, you must also enable sandboxing and be intentional about what users are allowed to do.

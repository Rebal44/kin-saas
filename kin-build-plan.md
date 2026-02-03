# Kin SaaS Build Plan

## Overview
Building Kin: The "Easy Button" for AI — Telegram-first.

## Architecture
- **Frontend:** Next.js 14 + Tailwind + shadcn/ui
- **Backend:** Next.js API routes
- **Database:** Supabase PostgreSQL
- **Auth:** Clerk (or Supabase Auth)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Bot Integration:** WhatsApp/Telegram webhook handlers

## Features to Build
1. Landing page (marketing site)
2. Stripe subscription ($29/month)
3. User auth (Clerk)
4. Dashboard with QR code for bot connection
5. Webhook handlers for WhatsApp/Telegram
6. Message relay system to the AI backend
7. Admin panel for monitoring

## Database Schema
- users (id, email, stripe_customer_id, subscription_status, created_at)
- subscriptions (id, user_id, stripe_subscription_id, status, current_period_end)
- bot_connections (id, user_id, platform, phone_number/chat_id, connected_at)
- conversations (id, user_id, platform, message, response, created_at)

## Environment Variables Needed
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- DATABASE_URL (Supabase)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PRICE_ID
- WHATSAPP_API_KEY (for bot)
- TELEGRAM_BOT_TOKEN (for bot)
- KIN_AI_API_KEY (for relay)

## Build Order
1. Initialize Next.js project with shadcn
2. Set up Supabase schema
3. Configure Clerk auth
4. Build landing page
5. Build subscription flow with Stripe
6. Build dashboard with QR code
7. Build webhook handlers
8. Deploy to Vercel
9. Test end-to-end

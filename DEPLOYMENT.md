# Deployment Guide

This guide covers deploying Kin SaaS to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Stripe Configuration](#stripe-configuration)
6. [Vercel Deployment](#vercel-deployment)
7. [Post-Deployment](#post-deployment)

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub repository with code pushed
- [ ] Vercel account connected to GitHub
- [ ] Supabase project created
- [ ] Stripe account set up
- [ ] Clerk account set up
- [ ] Domain name (optional but recommended)

## Infrastructure Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down:
   - Project URL
   - Anon key
   - Service role key
3. Save the database password securely

### 2. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete verification
3. Switch to Live mode when ready

### 3. Create Clerk Application

1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Configure OAuth providers (Google, GitHub, etc.)
4. Note down Publishable and Secret keys

## Environment Configuration

### 1. Vercel Environment Variables

Add these to your Vercel project settings:

#### Frontend Variables
```
NEXT_PUBLIC_APP_URL=https://kin-saas.com
NEXT_PUBLIC_API_URL=https://api.kin-saas.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_SENTRY_DSN=https://...
```

#### Backend Variables
```
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
OPENCLAW_API_KEY=...
TELEGRAM_BOT_TOKEN=...
WHATSAPP_API_KEY=...
SENTRY_DSN=https://...
JWT_SECRET=generate-a-secure-random-string
ENCRYPTION_KEY=generate-another-secure-key
```

### 2. Generate Secure Keys

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32
```

## Database Setup

### 1. Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 2. Verify RLS Policies

Check that Row Level Security is enabled:

```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

### 3. Configure Connection Pooling

In Supabase Dashboard:
1. Go to Database → Connection Pooling
2. Enable PgBouncer
3. Note the connection string for serverless environments

## Stripe Configuration

### 1. Create Product and Price

1. Go to Stripe Dashboard → Products
2. Click "Add product"
3. Name: "Kin Pro"
4. Description: "Unlimited AI conversations via WhatsApp & Telegram"
5. Pricing: $29.00 / month
6. Enable 7-day free trial

### 2. Configure Customer Portal

1. Go to Settings → Customer Portal
2. Enable "Allow customers to update payment methods"
3. Enable "Allow customers to update subscriptions"
4. Copy the Portal configuration ID
5. Add to environment: `STRIPE_PORTAL_CONFIG_ID`

### 3. Configure Webhooks

1. Go to Developers → Webhooks
2. Add endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to send:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.trial_will_end`
3. Copy the webhook signing secret
4. Add to environment: `STRIPE_WEBHOOK_SECRET`

### 4. Configure Clerk Webhooks

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint:
   - URL: `https://your-domain.com/api/auth/webhook`
   - Events: `user.created`, `user.updated`, `user.deleted`
3. Copy the signing secret
4. Add to environment: `CLERK_WEBHOOK_SECRET`

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `./kin` (for frontend)

### 2. Add API Routes

For the backend API, you have two options:

#### Option A: API Routes in Next.js (Recommended)
Move all API routes into the Next.js app under `kin/app/api/`.

#### Option B: Separate Vercel Project
1. Create a new Vercel project for `kin-backend`
2. Set framework preset to "Other"
3. Configure build command: `npm run build`
4. Set output directory: `dist`

### 3. Configure Domains

1. Add custom domain in Vercel Project Settings
2. Configure DNS:
   - CNAME: `cname.vercel-dns.com`
   - Or use A records if provided

### 4. Deploy

```bash
# Using Vercel CLI
vercel --prod
```

Or push to main branch for automatic deployment.

## Post-Deployment

### 1. Verify Deployment

Check these URLs:
- [ ] https://your-domain.com (site loads)
- [ ] https://your-domain.com/api/health (health check)
- [ ] https://your-domain.com/sign-in (auth works)

### 2. Test Payments

1. Go to pricing page
2. Click "Start Free Trial"
3. Use test card: `4242 4242 4242 4242`
4. Verify subscription created in Stripe

### 3. Test Bot Connections

#### Telegram
1. Find your bot in Telegram
2. Send `/start`
3. Verify connection appears in dashboard

#### WhatsApp
1. Scan QR code from dashboard
2. Send a message
3. Verify AI responds

### 4. Configure Monitoring

#### Sentry
1. Create project in Sentry
2. Add DSN to environment variables
3. Verify errors are captured

#### Vercel Analytics
1. Enable in Project Settings
2. Verify data collection

### 5. Set Up Alerts

Configure alerts for:
- [ ] High error rates (Sentry)
- [ ] Database connection issues (Supabase)
- [ ] Payment failures (Stripe)
- [ ] Low subscription conversion

### 6. SSL/TLS

Vercel automatically provisions SSL certificates. Verify:
- [ ] HTTPS working
- [ ] Certificate valid
- [ ] HSTS headers present

## Rollback Procedure

If deployment fails:

```bash
# Rollback to previous deployment
vercel rollback [deployment-url]

# Or redeploy previous commit
git revert HEAD
git push
```

## Troubleshooting

### Database Connection Errors

Check Supabase connection pooling is enabled and limits are appropriate.

### Webhook Errors

Verify:
- Webhook secrets match
- Endpoint URLs are correct
- Payloads are being received

### Build Failures

Check:
- All environment variables set
- Node.js version compatible
- No missing dependencies

## Maintenance

### Regular Tasks

- [ ] Review Sentry errors weekly
- [ ] Check Stripe failed payments
- [ ] Monitor database performance
- [ ] Update dependencies monthly

### Security Updates

1. Enable Dependabot alerts on GitHub
2. Review security advisories
3. Apply patches promptly

## Support

For deployment issues:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Supabase: [supabase.com/support](https://supabase.com/support)
- Stripe: [stripe.com/support](https://stripe.com/support)

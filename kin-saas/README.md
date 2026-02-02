# Kin SaaS

The "Easy Button" for AI - A consumer-facing wrapper around OpenClaw.

## Features

- **Landing Page**: Modern, clean design showcasing Kin's value proposition
- **Authentication**: Secure user auth powered by Clerk
- **Stripe Integration**: $29/month subscription with customer portal
- **Dashboard**: QR code connection for WhatsApp/Telegram bots
- **Database**: Supabase PostgreSQL for data persistence

## Tech Stack

- Next.js 14 + React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Clerk Authentication
- Stripe Payments
- Supabase Database

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (copy from `.env.local.template`):
```bash
cp .env.local.template .env.local
```

3. Fill in your credentials in `.env.local`

4. Run the development server:
```bash
npm run dev
```

## Deployment

This app is configured for Vercel deployment. Simply push to your GitHub repo and connect to Vercel.

## Environment Variables

See `.env.local.template` for required variables.

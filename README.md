# Kin SaaS

**The "Easy Button" for AI** — A consumer-facing wrapper around OpenClaw that lets users chat with AI through WhatsApp and Telegram.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🤖 **AI-Powered Conversations** - Chat with Claude/AI through familiar messaging apps
- 💬 **Multi-Platform** - Works on WhatsApp and Telegram
- 💳 **Simple Pricing** - $29/month with 7-day free trial
- 🔒 **Secure** - End-to-end encryption and privacy-focused
- ⚡ **Fast** - Real-time responses powered by OpenClaw

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, TypeScript
- **Database:** Supabase PostgreSQL
- **Auth:** Clerk
- **Payments:** Stripe
- **Hosting:** Vercel
- **Monitoring:** Sentry, Vercel Analytics

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Stripe account
- Clerk account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/kin-saas.git
   cd kin-saas
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd kin
   npm install
   
   # Backend
   cd ../kin-backend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run database migrations**
   ```bash
   npx supabase db push
   ```

5. **Start development servers**
   ```bash
   # Frontend
   cd kin && npm run dev
   
   # Backend (new terminal)
   cd kin-backend && npm run dev
   ```

### Environment Variables

See [`.env.example`](.env.example) for a complete list of required environment variables.

Key variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

## Project Structure

```
kin-saas/
├── kin/                    # Frontend (Next.js)
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   └── lib/               # Utility functions
├── kin-backend/           # Backend API (Express)
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   ├── stripe/       # Stripe integration
│   │   └── db/           # Database client
│   └── tests/            # Backend tests
├── supabase/
│   └── migrations/       # Database migrations
└── .github/workflows/    # CI/CD pipelines
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Manual Deployment

```bash
# Build frontend
cd kin && npm run build

# Build backend
cd ../kin-backend && npm run build

# Deploy to Vercel
vercel --prod
```

## API Documentation

See [API.md](API.md) for complete API documentation.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/webhook` | Clerk webhook handler |
| POST | `/api/stripe/create-checkout-session` | Create Stripe checkout |
| POST | `/api/stripe/webhook` | Stripe webhook handler |
| POST | `/api/bots/telegram/webhook` | Telegram bot webhook |
| POST | `/api/bots/whatsapp/webhook` | WhatsApp bot webhook |

## Webhook Configuration

### Stripe Webhooks

Configure these webhook endpoints in your Stripe Dashboard:

- **URL:** `https://your-domain.com/api/stripe/webhook`
- **Events:**
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`

### Clerk Webhooks

Configure in Clerk Dashboard:

- **URL:** `https://your-domain.com/api/auth/webhook`
- **Events:**
  - `user.created`
  - `user.updated`
  - `user.deleted`

### Telegram Bot

Set webhook via BotFather:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/bots/telegram/webhook" \
  -d "secret_token=<YOUR_SECRET>"
```

## Monitoring

- **Sentry:** Error tracking and performance monitoring
- **Vercel Analytics:** Web analytics
- **Supabase Dashboard:** Database monitoring

## Security

- All API endpoints protected with authentication
- Row Level Security (RLS) enabled on all database tables
- Rate limiting on all endpoints
- Webhook signature verification
- CORS properly configured
- Security headers set (CSP, HSTS, etc.)

See [SECURITY.md](SECURITY.md) for security guidelines.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@kin-saas.com
- 💬 Discord: [Join our community](https://discord.gg/kin-saas)
- 📖 Documentation: [docs.kin-saas.com](https://docs.kin-saas.com)

## Acknowledgments

- Built on top of [OpenClaw](https://openclaw.io)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

# Kin Backend (API)

The backend API for Kin: Stripe billing + Telegram webhook + message relay to your AI backend.

## 📁 Project Structure

```
kin-backend/
├── src/
│   ├── handlers/        # Express route handlers
│   │   ├── telegram.ts  # Telegram webhook handlers
│   ├── services/        # Business logic services
│   │   ├── telegram.ts  # Telegram Bot API client
│   │   ├── messageRelay.ts # Message routing/coordination
│   │   └── kinAi.ts     # Kin AI relay
│   ├── db/              # Database layer
│   │   └── index.ts     # Supabase client and operations
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   └── index.ts
│   ├── app.ts           # Express app (no listen)
│   └── server.ts        # Local dev server (listens)
├── api/
│   └── [...path].ts     # Vercel serverless entrypoint
├── tests/               # Test files
│   ├── webhooks.test.ts
│   └── integration.test.ts
├── scripts/             # Utility scripts
│   └── test-webhooks.sh # Manual webhook testing
├── schema.sql           # Legacy schema (use `supabase/migrations` instead)
├── .env.example         # Environment variable template
└── package.json
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd kin-backend
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Set Up Database

1. Create a new Supabase project
2. Apply migrations in `supabase/migrations/` (repo root)
3. Copy your Supabase URL + keys to `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 4. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 📡 API Endpoints

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/telegram` | Receive Telegram messages |
| POST | `/api/webhooks/stripe` | Stripe webhooks |

### Admin/Debug

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/webhooks/telegram/info` | Telegram webhook info |
| POST | `/api/webhooks/telegram/set-webhook` | Set Telegram webhook |

## 🔗 Webhook Configuration

### Telegram Bot

1. Create a bot via @BotFather
2. Set webhook automatically:
   ```bash
   curl -X POST http://localhost:3001/api/webhooks/telegram/set-webhook \
     -H "Content-Type: application/json" \
     -d '{"webhookUrl": "https://your-domain.com/api/webhooks/telegram"}'
   ```

## 🧪 Testing

### Automated Tests

```bash
npm test
```

### Manual Webhook Testing

```bash
# Run all tests
./scripts/test-webhooks.sh

# Run specific tests
./scripts/test-webhooks.sh health
./scripts/test-webhooks.sh telegram-start
```

### Test Individual Endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# Telegram message (simulated)
curl -X POST http://localhost:3001/api/webhooks/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123,
    "message": {
      "message_id": 456,
      "from": {"id": 789, "is_bot": false, "first_name": "Test"},
      "chat": {"id": 789, "type": "private"},
      "date": 1234567890,
      "text": "Hello!"
    }
  }'
```

## 📊 Database Schema

### Core Tables

- **users** - User accounts (email + Stripe customer id)
- **bot_connections** - Telegram connections per user
- **conversations** - Chat sessions
- **incoming_messages** - Messages from users
- **outgoing_messages** - Responses sent to users
- **conversation_messages** - Full chat history
- **subscriptions** - Stripe subscription data

See `supabase/migrations` for the schema (this repo’s source of truth).

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | For Telegram | Webhook secret token |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Yes | Stripe recurring price id ($29/mo) |
| `STRIPE_TOPUP_PRICE_ID` | Optional | Stripe one‑time price id for credits |
| `TOPUP_CREDITS` | Optional | Credits per top‑up (default 5000) |
| `KIN_AI_API_KEY` | Yes | Kimi API key |
| `KIN_AI_API_URL` | Optional | Base URL (default `https://api.moonshot.ai/v1`) |
| `KIN_AI_MODEL` | Optional | Model (default `kimi-k2.5`) |

## 📝 Message Flow

```
User → WhatsApp/Telegram → Webhook Handler
                                     ↓
                           Message Relay Service
                                     ↓
                           ┌─────────┴─────────┐
                           ↓                   ↓
                    Save to DB          Send to Kin AI
                           ↓                   ↓
                    Conversation      Get Response
                           ↓                   ↓
                           └─────────┬─────────┘
                                     ↓
                           Send Response to User
```

## 🛠️ Development

### Kimi Required

If `KIN_AI_API_KEY` is missing, Telegram replies will be disabled (no mock/fake responses).

### Adding New Features

1. Add types to `src/types/index.ts`
2. Add database operations to `src/db/index.ts`
3. Create/update service in `src/services/`
4. Add handler in `src/handlers/`
5. Register route in `src/app.ts`
6. Write tests in `tests/`

## 🚢 Deployment

### Vercel

```bash
npm i -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
 RUN npm run build
 EXPOSE 3001
 CMD ["node", "dist/server.js"]
```

## 📜 License

MIT

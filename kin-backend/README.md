# 🤖 Kin Backend - Bot Integration Layer

The backend API for Kin, handling WhatsApp and Telegram bot connections with message relay to OpenClaw.

## 📁 Project Structure

```
kin-backend/
├── src/
│   ├── handlers/        # Express route handlers
│   │   ├── whatsapp.ts  # WhatsApp webhook handlers
│   │   ├── telegram.ts  # Telegram webhook handlers
│   │   └── connection.ts # User connection endpoints
│   ├── services/        # Business logic services
│   │   ├── whatsapp.ts  # WhatsApp Business API client
│   │   ├── telegram.ts  # Telegram Bot API client
│   │   ├── messageRelay.ts # Message routing/coordination
│   │   └── openclaw.ts  # OpenClaw API relay
│   ├── db/              # Database layer
│   │   └── index.ts     # Supabase client and operations
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   └── index.ts
│   └── index.ts         # Express app entry point
├── tests/               # Test files
│   ├── webhooks.test.ts
│   └── integration.test.ts
├── scripts/             # Utility scripts
│   └── test-webhooks.sh # Manual webhook testing
├── schema.sql           # Database schema
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
2. Run the SQL in `schema.sql` in the Supabase SQL Editor
3. Copy your Supabase URL and Service Key to `.env`

### 4. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 📡 API Endpoints

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks/whatsapp` | WhatsApp webhook verification |
| POST | `/api/webhooks/whatsapp` | Receive WhatsApp messages |
| POST | `/api/webhooks/telegram` | Receive Telegram messages |

### Connection Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/connect/whatsapp` | Generate QR code for WhatsApp |
| GET | `/api/connect/telegram` | Generate Telegram bot link |
| GET | `/api/connections` | List user's connections |
| DELETE | `/api/connections/:id` | Disconnect a bot |

### Admin/Debug

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/webhooks/whatsapp/info` | WhatsApp config info |
| GET | `/api/webhooks/telegram/info` | Telegram webhook info |
| POST | `/api/webhooks/telegram/setup` | Set Telegram webhook |
| POST | `/api/test/send` | Send test message |

## 🔗 Webhook Configuration

### WhatsApp Business API

1. Create a Meta Developer account and WhatsApp Business app
2. Configure webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
3. Subscribe to `messages` webhook field
4. Verify token must match `WHATSAPP_VERIFY_TOKEN` in `.env`

### Telegram Bot

1. Create a bot via @BotFather
2. Set webhook automatically:
   ```bash
   curl -X POST http://localhost:3001/api/webhooks/telegram/setup \
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
./scripts/test-webhooks.sh whatsapp-message
./scripts/test-webhooks.sh telegram-start
```

### Test Individual Endpoints

```bash
# Health check
curl http://localhost:3001/health

# WhatsApp verification
curl "http://localhost:3001/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=kin-dev-token&hub.challenge=test123"

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

- **users** - User accounts linked to Clerk
- **bot_connections** - WhatsApp/Telegram connections per user
- **conversations** - Chat sessions
- **incoming_messages** - Messages from users
- **outgoing_messages** - Responses sent to users
- **conversation_messages** - Full chat history
- **subscriptions** - Stripe subscription data

See `schema.sql` for full schema with indexes and RLS policies.

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `WHATSAPP_PHONE_NUMBER_ID` | For WhatsApp | Meta phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | For WhatsApp | Meta access token |
| `WHATSAPP_VERIFY_TOKEN` | For WhatsApp | Webhook verify token |
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | For Telegram | Webhook secret token |
| `OPENCLAW_API_KEY` | For production | OpenClaw API key |
| `CLERK_SECRET_KEY` | For auth | Clerk secret key |

## 📝 Message Flow

```
User → WhatsApp/Telegram → Webhook Handler
                                     ↓
                           Message Relay Service
                                     ↓
                           ┌─────────┴─────────┐
                           ↓                   ↓
                    Save to DB          Send to OpenClaw
                           ↓                   ↓
                    Conversation      Get Response
                           ↓                   ↓
                           └─────────┬─────────┘
                                     ↓
                           Send Response to User
```

## 🛠️ Development

### Mock Mode

Without API credentials, the backend runs in mock mode:
- WhatsApp messages are logged but not sent
- Telegram messages are logged but not sent
- OpenClaw returns predefined responses based on keywords

### Adding New Features

1. Add types to `src/types/index.ts`
2. Add database operations to `src/db/index.ts`
3. Create/update service in `src/services/`
4. Add handler in `src/handlers/`
5. Register route in `src/index.ts`
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
CMD ["node", "dist/index.js"]
```

## 📜 License

MIT
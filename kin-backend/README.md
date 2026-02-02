# Kin Bot Integration

WhatsApp and Telegram bot integration layer for Kin AI assistant.

## Features

- 🤖 **Telegram Bot**: Full Bot API integration with webhook support
- 💬 **WhatsApp via Twilio**: Simple WhatsApp Business API alternative
- 🔐 **Secure Connection Flow**: Token-based user connection
- 📊 **Conversation History**: Stored in Supabase
- 🔄 **Retry Logic**: Automatic retry for failed messages
- 📱 **QR Code Generation**: Easy WhatsApp connection via QR
- 🔗 **Deep Links**: Telegram bot invite with auto-connect

## Quick Start

### 1. Install Dependencies

```bash
cd kin-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Set Up Database

Run the SQL in `src/db/schema.sql` in your Supabase SQL Editor.

### 4. Start Development Server

```bash
npm run dev
```

### 5. Configure Webhooks

**Telegram:**
```bash
# Set webhook (production)
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=https://your-domain.com/api/webhooks/telegram

# Or use the API
POST /api/webhooks/telegram/set-webhook
```

**Twilio WhatsApp:**
1. Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message
2. Set webhook URL to: `https://your-domain.com/api/webhooks/whatsapp`

## API Endpoints

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/telegram` | POST | Telegram bot webhook |
| `/api/webhooks/whatsapp` | POST | Twilio WhatsApp webhook |

### Connection Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connect` | POST | Generate connection link/QR |
| `/api/status/:userId` | GET | Get user connection status |
| `/api/send` | POST | Send message to user |
| `/api/health` | GET | Health check |

### WhatsApp Specific

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/whatsapp/qr?userId=xxx` | GET | Get QR code JSON |
| `/api/webhooks/whatsapp/connect?userId=xxx` | GET | QR code HTML page |

### Telegram Specific

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/telegram/info` | GET | Bot info & webhook status |
| `/api/webhooks/telegram/set-webhook` | POST | Set webhook |
| `/api/webhooks/telegram/delete-webhook` | POST | Delete webhook |

## Connection Flow

### Telegram

1. User signs up on Kin dashboard
2. Dashboard calls `POST /api/connect` with `platform: telegram`
3. Response includes `deepLink` like `https://t.me/bot_name?start=token`
4. User clicks link, opens Telegram, presses Start
5. Bot validates token and links accounts
6. User can now chat with Kin directly

### WhatsApp

1. User signs up on Kin dashboard
2. Dashboard calls `POST /api/connect` with `platform: whatsapp`
3. Response includes `qrCode` (base64) and `waLink`
4. User scans QR or clicks link
5. WhatsApp opens with pre-filled message
6. User sends message, bot validates and connects
7. User can now chat with Kin directly

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | Twilio WhatsApp number |
| `KIN_API_URL` | Yes | Kin backend API URL |

## Development

```bash
# Run with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint
npm run lint
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Telegram  │────▶│  Webhook    │────▶│   Kin Bot   │
│    User     │◀────│   Server    │◀────│ Integration │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
┌─────────────┐     ┌─────────────┐           │
│  WhatsApp   │────▶│   Twilio    │───────────┤
│    User     │◀────│   Webhook   │◀──────────┘
└─────────────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Supabase   │
                   │  (History)  │
                   └─────────────┘
```

## License

MIT

# 🤖 Kin Bot Integration

Complete WhatsApp and Telegram bot integration for Kin AI Assistant.

## Overview

This module provides:
- **Telegram Bot API** integration with webhooks
- **WhatsApp Business API** (Meta) support
- **Twilio WhatsApp** alternative (simpler setup)
- Secure connection flow with QR codes and deep links
- Conversation history storage in Supabase
- Automatic retry logic for failed messages
- Rate limiting and security middleware

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

## Configuration

### Telegram Setup

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token to `TELEGRAM_BOT_TOKEN`
4. (Optional) Set webhook secret for security

### WhatsApp Setup (Choose ONE)

#### Option A: WhatsApp Business API (Meta)

1. Create a Meta Developer account: https://developers.facebook.com
2. Set up WhatsApp Business API: https://business.facebook.com
3. Add a phone number and get:
   - Phone Number ID
   - Access Token
   - Verify Token

#### Option B: Twilio (Easier)

1. Sign up at https://www.twilio.com/try-twilio
2. Get a WhatsApp-enabled number
3. Get your Account SID and Auth Token
4. Set `WHATSAPP_USE_TWILIO=true`

## API Endpoints

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/telegram` | POST | Telegram bot webhook |
| `/api/webhooks/whatsapp` | POST | WhatsApp webhook |
| `/api/webhooks/whatsapp` | GET | WhatsApp webhook verification |

### Connection Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connect` | POST | Generate connection link/QR |
| `/api/status/:userId` | GET | Get user connection status |
| `/api/send` | POST | Send message to user |
| `/api/disconnect` | POST | Disconnect platform |
| `/api/platforms` | GET | List available platforms |

### Platform-Specific

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/telegram/connect?userId=xxx` | GET | Telegram connection page |
| `/api/webhooks/telegram/qr-page?userId=xxx` | GET | Telegram QR page HTML |
| `/api/webhooks/whatsapp/connect?userId=xxx` | GET | WhatsApp QR page HTML |
| `/api/webhooks/whatsapp/qr?userId=xxx` | GET | WhatsApp QR code JSON |

### Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/telegram/info` | GET | Bot info & webhook status |
| `/api/webhooks/telegram/set-webhook` | POST | Set webhook URL |
| `/api/webhooks/telegram/delete-webhook` | POST | Delete webhook |
| `/api/webhooks/whatsapp/info` | GET | WhatsApp status |

## Connection Flow

### Telegram

```
User Dashboard                    Telegram Bot
     |                                  |
     |  1. POST /api/connect           |
     |     {platform: telegram}        |
     |-------------------------------->|
     |                                  |
     |  2. {deepLink, inviteLink}      |
     |<--------------------------------|
     |                                  |
     |  3. Show QR/page to user        |
     |                                  |
     |  4. User clicks deepLink        |
     |-------------------|------------->|
     |                   |              |
                         |  5. /start cmd
                         |------------->|
                         |              |
                         |  6. Welcome msg
                         |<-------------|
                         |              |
     |                   |              |
     |  7. Chat with Kin |              |
     |<------------------|-------------|
```

### WhatsApp

```
User Dashboard                    WhatsApp
     |                               |
     |  1. POST /api/connect        |
     |     {platform: whatsapp}     |
     |----------------------------->|
     |                               |
     |  2. {qrCode, waLink}         |
     |<-----------------------------|
     |                               |
     |  3. Show QR code to user      |
     |                               |
     |  4. User scans QR             |
     |--------------|--------------->|
     |              |                |
                    |  5. START msg
                    |--------------->|
                    |                |
                    |  6. Welcome msg
                    |<---------------|
                    |                |
     |              |                |
     |  7. Chat with Kin            |
     |<-------------|---------------|
```

## Usage Examples

### Generate Connection Link

```bash
curl -X POST http://localhost:3001/api/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "platform": "telegram"
  }'
```

Response:
```json
{
  "success": true,
  "connectionId": "conn-uuid",
  "inviteLink": "https://t.me/kin_assistant_bot",
  "deepLink": "https://t.me/kin_assistant_bot?start=conn-uuid",
  "instructions": "Click the deep link to open Telegram..."
}
```

### Generate WhatsApp Connection

```bash
curl -X POST http://localhost:3001/api/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "platform": "whatsapp"
  }'
```

Response:
```json
{
  "success": true,
  "connectionId": "conn-uuid",
  "qrCode": "data:image/png;base64,...",
  "waLink": "https://wa.me/1234567890?text=START%20conn-uuid",
  "instructions": "Scan the QR code or click the link..."
}
```

### Send Message to User

```bash
curl -X POST http://localhost:3001/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "platform": "telegram",
    "message": "Hello from Kin!"
  }'
```

### Check Connection Status

```bash
curl http://localhost:3001/api/status/user-uuid
```

Response:
```json
{
  "success": true,
  "userId": "user-uuid",
  "connections": [
    {
      "id": "conn-uuid",
      "platform": "telegram",
      "isConnected": true,
      "connectedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalConnections": 1,
  "hasActiveConnection": true
}
```

## Database Schema

### Tables

**users** - Kin users (managed by Clerk)
- `id` (UUID)
- `clerk_id` (string)
- `email` (string)
- `subscription_status`

**bot_connections** - Platform connections
- `id` (UUID)
- `user_id` (UUID)
- `platform` (whatsapp|telegram)
- `phone_number` (whatsapp)
- `chat_id` (telegram)
- `is_connected` (boolean)
- `connected_at`

**incoming_messages** - Messages from users
- `id` (UUID)
- `connection_id` (UUID)
- `platform`
- `content`
- `message_type`
- `external_id`

**outgoing_messages** - Messages to users
- `id` (UUID)
- `connection_id` (UUID)
- `platform`
- `content`
- `status` (pending|sent|delivered|failed)

**conversations** - Conversation threads
- `id` (UUID)
- `user_id`
- `connection_id`
- `platform`

**conversation_messages** - Individual messages in conversations
- `id` (UUID)
- `conversation_id`
- `role` (user|assistant)
- `content`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      KIN BACKEND                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Telegram   │      │   WhatsApp   │      │    API    │ │
│  │   Routes     │      │   Routes     │      │  Routes   │ │
│  └──────┬───────┘      └──────┬───────┘      └─────┬─────┘ │
│         │                      │                    │       │
│  ┌──────▼───────┐      ┌──────▼───────┐      ┌─────▼────┐  │
│  │   Telegram   │      │   WhatsApp   │      │  Message │  │
│  │   Service    │      │   Service    │      │  Relay   │  │
│  └──────┬───────┘      └──────┬───────┘      └─────┬────┘  │
│         │                      │                    │       │
│         └──────────────────────┼────────────────────┘       │
│                                │                            │
│                       ┌────────▼────────┐                   │
│                       │  OpenClaw Relay │                   │
│                       │  (to Kin Core)  │                   │
│                       └─────────────────┘                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL)                                      │
│  - Users, Messages, Conversations                           │
└─────────────────────────────────────────────────────────────┘
```

## Security

- Webhook signature verification
- Rate limiting per user/IP
- Secret tokens for webhook endpoints
- CORS configuration
- Helmet security headers
- Row Level Security (RLS) in Supabase

## Development

```bash
# Start with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Generate database types
npm run db:generate
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure webhooks with your domain:
   - Telegram: `https://your-domain.com/api/webhooks/telegram`
   - WhatsApp: `https://your-domain.com/api/webhooks/whatsapp`
3. Set strong webhook secrets
4. Enable CORS for your frontend domain
5. Configure Sentry for error tracking

## Troubleshooting

### Telegram webhook not receiving messages
- Check webhook is set: `GET /api/webhooks/telegram/info`
- Verify secret token matches
- Ensure HTTPS URL is used in production

### WhatsApp messages not sending
- Verify phone number is registered
- Check access token hasn't expired
- Ensure message template is approved (for Business API)

### Database connection errors
- Verify Supabase credentials
- Check IP allowlist in Supabase
- Ensure RLS policies are configured

## License

MIT

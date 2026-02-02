# Kin Database Schema & API

Complete database schema and API layer for the Kin AI assistant platform.

## 📁 Project Structure

```
kin/
├── migrations/           # SQL migrations for Supabase
│   └── 001_initial_schema.sql
├── types/               # TypeScript type definitions
│   └── index.ts
├── lib/                 # Shared utilities
│   ├── supabase.ts      # Supabase client configuration
│   ├── auth.ts          # Authentication middleware
│   └── errors.ts        # Error handling utilities
└── api/                 # Next.js API routes
    ├── auth/
    │   ├── register/route.ts
    │   └── login/route.ts
    ├── user/
    │   ├── me/route.ts
    │   └── connections/route.ts
    ├── connect/
    │   ├── whatsapp/route.ts
    │   └── telegram/route.ts
    ├── connections/
    │   └── [id]/route.ts
    ├── conversations/
    │   └── route.ts
    ├── usage/
    │   └── route.ts
    ├── messages/
    │   └── send/route.ts
    └── webhooks/
        ├── telegram/route.ts
        └── whatsapp/route.ts
```

## 🗄️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | Core user accounts with Stripe integration |
| `subscriptions` | Stripe subscription data |
| `bot_connections` | WhatsApp/Telegram connections |
| `conversations` | Message history (inbound/outbound) |
| `usage_logs` | Credit consumption tracking |

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data.

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Authenticate user |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/me` | Get profile + subscription |
| GET | `/api/user/connections` | List all connections |

### Bot Connections
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/connect/whatsapp` | Connect WhatsApp |
| POST | `/api/connect/telegram` | Connect Telegram |
| DELETE | `/api/connections/:id` | Remove connection |

### Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | Message history |
| GET | `/api/usage` | Usage & credits |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/telegram` | Telegram bot webhooks |
| GET/POST | `/api/webhooks/whatsapp` | WhatsApp webhooks |

## 🚀 Setup

### 1. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp Business API
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=

# Telegram Bot
TELEGRAM_BOT_TOKEN=
```

### 2. Apply Migrations

```bash
# Using Supabase CLI
supabase db reset
supabase db push

# Or run directly in Supabase SQL Editor
cat migrations/001_initial_schema.sql | pbcopy
# Paste into SQL Editor
```

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js next
```

## 🔒 Security

- **RLS Policies**: All tables enforce user isolation
- **JWT Auth**: Bearer token required for all protected endpoints
- **Admin Client**: Service role key only used for auth operations
- **Webhook Verification**: WhatsApp verify token, Telegram secret

## 📝 TypeScript Usage

```typescript
import { Database, User, BotConnection } from './types';
import { supabaseClient } from './lib/supabase';

// Type-safe queries
const { data } = await supabaseClient
  .from('users')
  .select('*')
  .single();

// Types are inferred
const user: User = data;
```

## 🔄 Frontend/Backend Coordination

### For Frontend Team
- Use generated types from `types/index.ts`
- All API responses are typed
- Auth tokens: Store in memory or secure cookie

### For Backend Team
- Extend webhook handlers for AI processing
- Add rate limiting middleware
- Implement credit balance checking

## 📋 Todo

- [ ] Add rate limiting
- [ ] Credit balance API
- [ ] Stripe webhook handlers
- [ ] Message queue for outbound
- [ ] AI integration hooks

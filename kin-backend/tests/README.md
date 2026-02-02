# Kin SaaS Testing Infrastructure

This directory contains comprehensive test coverage for the Kin SaaS application.

## Test Structure

```
tests/
├── unit/                    # Vitest unit tests
│   ├── auth.test.ts        # Auth utility tests
│   ├── stripe.test.ts      # Stripe webhook handler tests
│   ├── db.test.ts          # Database query tests
│   └── message-parser.test.ts  # Message parsing tests
├── integration/            # Playwright integration tests
│   ├── landing.spec.ts     # Landing page tests
│   ├── auth.spec.ts        # Sign up flow tests
│   ├── subscription.spec.ts # Stripe checkout tests
│   └── dashboard.spec.ts   # Dashboard tests
├── api/                    # API endpoint tests
│   ├── auth.test.ts        # Auth endpoints
│   ├── webhooks.test.ts    # Bot webhook endpoints
│   └── users.test.ts       # User management endpoints
├── e2e/                    # End-to-end tests
│   ├── whatsapp-journey.spec.ts  # WhatsApp complete flow
│   └── telegram-journey.spec.ts  # Telegram complete flow
├── load/                   # Load/performance tests
│   ├── webhooks.load.ts    # Webhook performance
│   └── database.load.ts    # Database performance
├── fixtures/               # Test data and mocks
│   ├── stripe-events.ts    # Mock Stripe events
│   ├── bot-connections.ts  # Test bot connections
│   └── conversations.ts    # Test conversations
└── setup/                  # Test setup and utilities
    ├── test-utils.ts       # Test utilities
    └── vitest.setup.ts     # Vitest configuration
```

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run API tests
npm run test:api

# Run E2E tests
npm run test:e2e

# Run load tests
npm run test:load

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## CI Integration

Tests run automatically on every push:
1. Lint checks
2. Unit tests with coverage
3. Integration tests
4. API tests
5. E2E tests (on PR/main branch)

Deploy is blocked if any test fails.

## Test Data

Mock data is located in `tests/fixtures/`:
- Stripe webhook events
- Bot connection states
- Sample conversations
- Test user data

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { json, urlencoded } from 'express';

// Load environment variables (local dev)
dotenv.config();

// Import middleware
import { corsOptions, securityHeaders, requestId } from './middleware/security';
import rateLimitConfigs from './middleware/rateLimit';
import { supabase } from './db/client';
import { log } from './utils/logger';

// Import routes
import stripeRoutes from './routes/stripe';
import telegramRoutes from './routes/telegram';

const app = express();

// Trust proxy (needed for Vercel)
app.set('trust proxy', 1);

// Attach Supabase to app for access in routes/middleware that expect it
app.locals.supabase = supabase;

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(requestId);

// Rate limiting
app.use(rateLimitConfigs.api);

// Stripe webhook endpoint MUST be registered before JSON parsing so signature verification works.
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const { handleStripeWebhook } = await import('./stripe/webhooks');
    await handleStripeWebhook(req, res);
  }
);

// Body parsing (everything else)
app.use(
  json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    log.request(req as any, res as any, duration);
  });

  next();
});

// ============================================
// TELEGRAM-ONLY ROUTES (MVP)
// ============================================

app.use('/api/webhooks/telegram', telegramRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const dbHealth = await import('./db/client').then((m) => m.checkDatabaseHealth());
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: dbHealth.healthy ? 'connected' : 'disconnected',
    databaseLatency: dbHealth.latency,
    integrations: {
      telegram: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
      ai: process.env.KIN_AI_API_KEY ? 'configured' : 'not_configured',
    },
  });
});

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'Kin API',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      health: '/api/health',
      webhooks: {
        telegram: '/api/webhooks/telegram',
        stripe: '/api/webhooks/stripe',
      },
    },
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error('Unhandled error', err, {
    path: req.path,
    method: req.method,
    requestId: (req as any).id,
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    requestId: (req as any).id,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

export default app;

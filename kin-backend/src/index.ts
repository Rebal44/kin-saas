import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { json, urlencoded } from 'express';

// Load environment variables
dotenv.config();

// Import middleware
import { corsOptions, securityHeaders, requestId } from './middleware/security';
import rateLimitConfigs from './middleware/rateLimit';
import { supabase } from './db/client';
import logger, { log } from './utils/logger';

// Import routes
import stripeRoutes from './routes/stripe';
import telegramRoutes from './routes/telegram';
import whatsappRoutes from './routes/whatsapp';
import apiRoutes from './routes/api';

// Import services for initialization
import { telegramService } from './services/telegram';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (needed for Vercel)
app.set('trust proxy', 1);

// Attach Supabase to app for access in routes
app.locals.supabase = supabase;

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(requestId);

// Rate limiting
app.use(rateLimitConfigs.api);

// Body parsing
app.use(json({ 
  verify: (req: any, res, buf) => {
    req.rawBody = buf; // Save raw body for webhook signature verification
  }
}));
app.use(urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.request(req, res, duration);
  });
  
  next();
});

// ============================================
// KIN BOT INTEGRATION ROUTES
// ============================================

// Telegram webhook routes - /api/webhooks/telegram
app.use('/api/webhooks/telegram', telegramRoutes);

// WhatsApp webhook routes - /api/webhooks/whatsapp
app.use('/api/webhooks/whatsapp', whatsappRoutes);

// API routes for connection management - /api/*
app.use('/api', apiRoutes);

// ============================================
// EXISTING ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbHealth = await import('./db/client').then(m => m.checkDatabaseHealth());
  const telegramBot = await telegramService.getMe();
  const whatsappConfigured = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    database: dbHealth.healthy ? 'connected' : 'disconnected',
    databaseLatency: dbHealth.latency,
    integrations: {
      telegram: telegramBot ? 'connected' : 'disconnected',
      whatsapp: whatsappConfigured ? 'configured' : 'not_configured',
    },
  });
});

// Stripe routes
app.use('/api/stripe', stripeRoutes);

// Stripe webhook endpoint (must be before JSON parsing for raw body)
app.post('/api/webhooks/stripe', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const { handleStripeWebhook } = await import('./stripe/webhooks');
    await handleStripeWebhook(req, res);
  }
);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Kin API',
    description: 'Kin AI Assistant API with WhatsApp and Telegram integrations',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      health: '/api/health',
      webhooks: {
        telegram: '/api/webhooks/telegram',
        whatsapp: '/api/webhooks/whatsapp',
      },
      api: {
        connect: 'POST /api/connect',
        status: 'GET /api/status/:userId',
        send: 'POST /api/send',
        platforms: 'GET /api/platforms',
        disconnect: 'POST /api/disconnect',
      },
    },
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error('Unhandled error', err, {
    path: req.path,
    method: req.method,
    requestId: req.id
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    requestId: req.id
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    log.info(`Server running on port ${PORT}`, {
      environment: process.env.NODE_ENV,
      port: PORT
    });

    // Initialize Telegram webhook in production
    if (process.env.NODE_ENV === 'production' && process.env.TELEGRAM_WEBHOOK_URL) {
      log.info('Setting up Telegram webhook...');
      const success = await telegramService.setWebhook(
        process.env.TELEGRAM_WEBHOOK_URL,
        process.env.TELEGRAM_WEBHOOK_SECRET
      );
      if (success) {
        log.info('✅ Telegram webhook configured');
      } else {
        log.error('❌ Failed to set Telegram webhook');
      }
    }
  });
}

export default app;

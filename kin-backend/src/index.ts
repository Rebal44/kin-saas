import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { logger } from './utils';
import { openClawRelayService } from './services/openclaw';

// Import handlers
import {
  handleWhatsAppVerification,
  handleWhatsAppWebhook,
  getWhatsAppWebhookInfo,
} from './handlers/whatsapp';

import {
  handleTelegramWebhook,
  setupTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramWebhookInfo,
} from './handlers/telegram';

import {
  generateWhatsAppConnection,
  generateTelegramConnection,
  getUserConnections,
  disconnectBot,
} from './handlers/connection';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const openClawHealth = await openClawRelayService.healthCheck();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'ok', // Would check actual connection in production
      openclaw: openClawHealth,
    },
  });
});

// ============================================
// Webhook Routes
// ============================================

// WhatsApp Webhook
// GET for verification, POST for messages
app.route('/api/webhooks/whatsapp')
  .get(handleWhatsAppVerification)
  .post(handleWhatsAppWebhook);

// WhatsApp webhook info (for debugging)
app.get('/api/webhooks/whatsapp/info', getWhatsAppWebhookInfo);

// Telegram Webhook
app.post('/api/webhooks/telegram', handleTelegramWebhook);

// Telegram webhook management
app.route('/api/webhooks/telegram/setup')
  .post(setupTelegramWebhook)
  .delete(deleteTelegramWebhook);

app.get('/api/webhooks/telegram/info', getTelegramWebhookInfo);

// ============================================
// Connection Routes
// ============================================

// Generate connection links
app.get('/api/connect/whatsapp', generateWhatsAppConnection);
app.get('/api/connect/telegram', generateTelegramConnection);

// Get user's connections
app.get('/api/connections', getUserConnections);

// Disconnect a bot
app.delete('/api/connections/:connectionId', disconnectBot);

// ============================================
// API Routes (for frontend)
// ============================================

// Get current user (placeholder - would integrate with Clerk)
app.get('/api/me', (req: Request, res: Response) => {
  const clerkId = req.headers['x-clerk-user-id'] as string;
  
  if (!clerkId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  // In production, fetch user from database
  res.json({
    success: true,
    data: {
      clerk_id: clerkId,
      // Additional user data would be fetched from DB
    },
  });
});

// Send test message (for development)
app.post('/api/test/send', async (req: Request, res: Response) => {
  const { platform, to, message } = req.body;

  if (!platform || !to || !message) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: platform, to, message',
    });
    return;
  }

  try {
    const { whatsAppService } = await import('./services/whatsapp');
    const { telegramService } = await import('./services/telegram');

    let success = false;

    if (platform === 'whatsapp') {
      success = await whatsAppService.sendTextMessage(to, message);
    } else if (platform === 'telegram') {
      success = await telegramService.sendTextMessage(to, message);
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be "whatsapp" or "telegram"',
      });
      return;
    }

    res.json({
      success,
      message: success ? 'Message sent' : 'Failed to send message',
    });
  } catch (error) {
    logger.error('Error sending test message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Kin Backend server running on port ${PORT}`);
  logger.info(`📱 WhatsApp webhook: http://localhost:${PORT}/api/webhooks/whatsapp`);
  logger.info(`✈️ Telegram webhook: http://localhost:${PORT}/api/webhooks/telegram`);
  logger.info(`🔗 Connection endpoints:`);
  logger.info(`   - WhatsApp: GET http://localhost:${PORT}/api/connect/whatsapp`);
  logger.info(`   - Telegram: GET http://localhost:${PORT}/api/connect/telegram`);
});

export default app;
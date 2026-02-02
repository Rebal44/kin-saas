// src/routes/api.ts
// API routes for connection management and messaging

import { Router, Request, Response } from 'express';
import { telegramService } from '../services/telegram';
import { whatsAppService } from '../services/whatsapp';
import { 
  createBotConnection,
  getBotConnectionsByUserId,
  getBotConnectionById,
  updateBotConnection,
  getBotConnectionByPlatformAndIdentifier,
} from '../db';
import { logger, retryWithBackoff } from '../utils';
import { rateLimit } from '../middleware/rateLimit';
import QRCode from 'qrcode';

const router = Router();

// Apply rate limiting
router.use(rateLimit(100, 60000));

// Health check
// GET /api/health
router.get('/health', async (_req: Request, res: Response) => {
  const telegramHealthy = !!(await telegramService.getMe());
  const whatsappHealthy = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      telegram: telegramHealthy ? 'connected' : 'disconnected',
      whatsapp: whatsappHealthy ? 'configured' : 'not_configured',
    },
  });
});

// Generate connection link for user
// POST /api/connect
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { userId, platform } = req.body;

    if (!userId || !platform) {
      res.status(400).json({ 
        error: 'Missing required fields: userId, platform' 
      });
      return;
    }

    if (!['whatsapp', 'telegram'].includes(platform)) {
      res.status(400).json({ 
        error: 'Invalid platform. Must be "whatsapp" or "telegram"' 
      });
      return;
    }

    // Create a pending connection
    const connection = await createBotConnection({
      user_id: userId,
      platform,
      is_connected: false,
    });

    if (!connection) {
      res.status(500).json({ error: 'Failed to create connection' });
      return;
    }

    // Generate platform-specific connection data
    let responseData: any = {
      success: true,
      connectionId: connection.id,
      userId,
      platform,
      status: 'pending',
      createdAt: connection.created_at,
    };

    if (platform === 'telegram') {
      // Get bot info
      const botInfo = await telegramService.getMe();
      if (!botInfo) {
        res.status(500).json({ error: 'Failed to get Telegram bot info' });
        return;
      }

      const deepLink = `https://t.me/${botInfo.username}?start=${connection.id}`;
      
      responseData = {
        ...responseData,
        inviteLink: `https://t.me/${botInfo.username}`,
        deepLink,
        botUsername: botInfo.username,
        instructions: 'Click the deep link to open Telegram and start chatting with Kin.',
        qrPageUrl: `/api/webhooks/telegram/qr-page?userId=${userId}`,
      };
    } else if (platform === 'whatsapp') {
      // Get the WhatsApp Business number
      const phoneNumber = process.env.WHATSAPP_PHONE_NUMBER?.replace('+', '');
      
      if (!phoneNumber) {
        res.status(500).json({ error: 'WhatsApp phone number not configured' });
        return;
      }

      // Generate WhatsApp click-to-chat link
      const message = `START ${connection.id}`;
      const waLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

      // Generate QR code
      const qrCode = await QRCode.toDataURL(waLink, {
        width: 400,
        margin: 2,
        color: { dark: '#25d366', light: '#ffffff' },
      });

      responseData = {
        ...responseData,
        qrCode,
        waLink,
        phoneNumber: `+${phoneNumber}`,
        instructions: 'Scan the QR code or click the link to open WhatsApp and connect.',
        connectPageUrl: `/api/webhooks/whatsapp/connect?userId=${userId}`,
      };
    }

    res.json(responseData);

  } catch (error) {
    logger.error('Error generating connection:', error);
    res.status(500).json({ error: 'Failed to generate connection' });
  }
});

// Get connection status for a user
// GET /api/status/:userId
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const connections = await getBotConnectionsByUserId(userId);

    res.json({
      success: true,
      userId,
      connections: connections.map(conn => ({
        id: conn.id,
        platform: conn.platform,
        isConnected: conn.is_connected,
        connectedAt: conn.connected_at,
        identifier: conn.platform === 'whatsapp' ? conn.phone_number : conn.chat_id,
      })),
      totalConnections: connections.length,
      hasActiveConnection: connections.some(c => c.is_connected),
    });

  } catch (error) {
    logger.error('Error getting connection status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Send message to a user
// POST /api/send
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, platform, message } = req.body;

    if (!userId || !platform || !message) {
      res.status(400).json({ 
        error: 'Missing required fields: userId, platform, message' 
      });
      return;
    }

    // Get user's connection
    const connections = await getBotConnectionsByUserId(userId);
    const connection = connections.find(
      c => c.platform === platform && c.is_connected
    );

    if (!connection) {
      res.status(404).json({ 
        error: 'No active connection found for this user on the specified platform' 
      });
      return;
    }

    let success = false;

    if (platform === 'telegram' && connection.chat_id) {
      success = await telegramService.sendTextMessage(
        connection.chat_id,
        message
      );
    } else if (platform === 'whatsapp' && connection.phone_number) {
      success = await whatsAppService.sendTextMessage(
        connection.phone_number,
        message
      );
    } else {
      res.status(400).json({ error: 'Invalid platform or missing identifier' });
      return;
    }

    if (success) {
      res.json({
        success: true,
        message: 'Message sent successfully',
      });
    } else {
      res.status(500).json({ error: 'Failed to send message' });
    }

  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Disconnect a platform
// POST /api/disconnect
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { userId, platform } = req.body;

    if (!userId || !platform) {
      res.status(400).json({ 
        error: 'Missing required fields: userId, platform' 
      });
      return;
    }

    const connections = await getBotConnectionsByUserId(userId);
    const connection = connections.find(c => c.platform === platform);

    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    // Mark as disconnected
    await updateBotConnection(connection.id, {
      is_connected: false,
      disconnected_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Disconnected from ${platform}`,
    });

  } catch (error) {
    logger.error('Error disconnecting:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Get available platforms and their status
// GET /api/platforms
router.get('/platforms', async (_req: Request, res: Response) => {
  const telegramBot = await telegramService.getMe();
  const whatsappConfigured = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  
  res.json({
    success: true,
    platforms: [
      {
        id: 'telegram',
        name: 'Telegram',
        available: !!telegramBot,
        botUsername: telegramBot?.username,
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        available: whatsappConfigured,
        phoneNumber: process.env.WHATSAPP_PHONE_NUMBER,
      },
    ],
  });
});

export default router;

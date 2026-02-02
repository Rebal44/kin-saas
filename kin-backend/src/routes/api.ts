// src/routes/api.ts
// API routes for connection management

import { Router, Request, Response } from 'express';
import { createConnectionToken } from '../db/client';
import { telegramService } from '../services/telegram';
import { whatsappService } from '../services/whatsapp';
import { logger } from '../utils/logger';

const router = Router();

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

    // Create connection token
    const token = await createConnectionToken(userId, platform);

    // Generate platform-specific connection data
    let connectionData: any = {
      token,
      platform,
    };

    if (platform === 'telegram') {
      // Get bot info for invite link
      const botInfo = await telegramService.getMe();
      const botUsername = botInfo?.username || process.env.TELEGRAM_BOT_USERNAME;
      
      const deepLink = `https://t.me/${botUsername}?start=${token}`;
      
      connectionData = {
        ...connectionData,
        inviteLink: `https://t.me/${botUsername}`,
        deepLink,
        botUsername,
        instructions: 'Click the link above to open Telegram and start chatting with Kin.',
      };
    } else if (platform === 'whatsapp') {
      // Generate WhatsApp QR/link
      const waResult = await whatsappService.generateConnectionQR(userId);
      
      if (waResult) {
        connectionData = {
          ...connectionData,
          qrCode: waResult.qrCode,
          waLink: waResult.waLink,
          instructions: 'Scan the QR code or click the link to open WhatsApp and connect.',
        };
      }
    }

    res.json({
      success: true,
      userId,
      ...connectionData,
    });

  } catch (error) {
    logger.error('Error generating connection:', error);
    res.status(500).json({ error: 'Failed to generate connection' });
  }
});

// Get connection status
// GET /api/status/:userId
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const supabase = (await import('../db/client')).getSupabaseClient();

    const { data: connections, error } = await supabase
      .from('users')
      .select('platform, is_connected, connected_at, updated_at')
      .eq('id', userId);

    if (error) throw error;

    res.json({
      userId,
      connections: connections || [],
      totalConnections: connections?.length || 0,
    });

  } catch (error) {
    logger.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Send message to user
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

    const supabase = (await import('../db/client')).getSupabaseClient();

    // Get user's platform chat ID
    const { data: user, error } = await supabase
      .from('users')
      .select('platform_user_id')
      .eq('id', userId)
      .eq('platform', platform)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'User not found or not connected on this platform' });
      return;
    }

    let result;
    if (platform === 'telegram') {
      result = await telegramService.sendMessage(user.platform_user_id, message);
    } else if (platform === 'whatsapp') {
      result = await whatsappService.sendMessage(user.platform_user_id, message);
    } else {
      res.status(400).json({ error: 'Invalid platform' });
      return;
    }

    if (result.success) {
      // Save outgoing message
      await (await import('../db/client')).saveMessage({
        platform,
        platform_message_id: result.messageId || 'unknown',
        user_id: userId,
        chat_id: user.platform_user_id,
        content: message,
        direction: 'outbound',
        status: 'sent',
      });

      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }

  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Health check
// GET /api/health
router.get('/health', async (_req: Request, res: Response) => {
  const kinHealthy = await (await import('../services/kin')).kinBackendService.healthCheck();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      kinBackend: kinHealthy ? 'connected' : 'disconnected',
    },
  });
});

export default router;

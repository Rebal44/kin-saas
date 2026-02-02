import { Request, Response } from 'express';
import { telegramService } from '../services/telegram';
import { messageRelayService } from '../services/messageRelay';
import { logger } from '../utils';
import { TelegramWebhookPayload } from '../types';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'kin-telegram-secret';

// Handle incoming Telegram messages
export async function handleTelegramWebhook(req: Request, res: Response): Promise<void> {
  // Verify secret token if configured
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'] as string;
  
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    logger.warn('Invalid Telegram webhook secret');
    res.sendStatus(403);
    return;
  }

  // Acknowledge receipt immediately
  res.sendStatus(200);

  try {
    const payload = req.body as TelegramWebhookPayload;
    
    logger.info('Received Telegram webhook', { 
      updateId: payload.update_id,
      hasMessage: !!payload.message,
      hasCallbackQuery: !!payload.callback_query,
    });

    // Parse the webhook payload
    const parsed = telegramService.parseWebhookPayload(payload);

    if (!parsed || (!parsed.message && !parsed.editedMessage)) {
      logger.info('No message in webhook payload');
      return;
    }

    const message = parsed.message || parsed.editedMessage;
    
    if (!message) {
      return;
    }

    // Process the message
    await messageRelayService.processTelegramMessage(message);

  } catch (error) {
    logger.error('Error handling Telegram webhook:', error);
  }
}

// Set up Telegram webhook
export async function setupTelegramWebhook(req: Request, res: Response): Promise<void> {
  try {
    const webhookUrl = req.body?.webhookUrl as string | undefined;
    
    if (!webhookUrl) {
      res.status(400).json({
        success: false,
        error: 'webhookUrl is required',
      });
      return;
    }

    const success = await telegramService.setWebhook(webhookUrl, WEBHOOK_SECRET);

    if (success) {
      res.json({
        success: true,
        message: 'Webhook set successfully',
        webhookUrl,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to set webhook',
      });
    }
  } catch (error) {
    logger.error('Error setting up Telegram webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Delete Telegram webhook
export async function deleteTelegramWebhook(req: Request, res: Response): Promise<void> {
  try {
    const success = await telegramService.deleteWebhook();

    if (success) {
      res.json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete webhook',
      });
    }
  } catch (error) {
    logger.error('Error deleting Telegram webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Get webhook info
export async function getTelegramWebhookInfo(req: Request, res: Response): Promise<void> {
  try {
    const info = await telegramService.getWebhookInfo();
    const botInfo = await telegramService.getMe();

    res.json({
      success: true,
      data: {
        webhook: info,
        bot: botInfo,
        secretConfigured: !!process.env.TELEGRAM_WEBHOOK_SECRET,
      },
    });
  } catch (error) {
    logger.error('Error getting Telegram webhook info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
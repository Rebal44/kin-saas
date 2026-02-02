import { Request, Response } from 'express';
import { whatsAppService } from '../services/whatsapp';
import { messageRelayService } from '../services/messageRelay';
import { logger } from '../utils';
import { WhatsAppWebhookPayload } from '../types';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'kin-dev-token';

// Handle WhatsApp webhook verification (GET request)
export function handleWhatsAppVerification(req: Request, res: Response): void {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  logger.info('WhatsApp webhook verification attempt', { mode, token });

  const result = whatsAppService.verifyWebhook(mode, token, challenge, VERIFY_TOKEN);

  if (result) {
    res.status(200).send(result);
  } else {
    res.sendStatus(403);
  }
}

// Handle incoming WhatsApp messages (POST request)
export async function handleWhatsAppWebhook(req: Request, res: Response): Promise<void> {
  // Acknowledge receipt immediately
  res.sendStatus(200);

  try {
    const payload = req.body as WhatsAppWebhookPayload;
    
    logger.info('Received WhatsApp webhook', { 
      object: payload.object,
      entryCount: payload.entry?.length 
    });

    // Parse the webhook payload
    const parsed = whatsAppService.parseWebhookPayload(payload);

    if (!parsed || parsed.messages.length === 0) {
      logger.info('No messages in webhook payload');
      return;
    }

    // Process each message
    for (const message of parsed.messages) {
      // Skip messages from the bot itself
      if (message.from === process.env.WHATSAPP_PHONE_NUMBER) {
        continue;
      }

      await messageRelayService.processWhatsAppMessage(
        message,
        process.env.WHATSAPP_PHONE_NUMBER_ID || ''
      );
    }
  } catch (error) {
    logger.error('Error handling WhatsApp webhook:', error);
  }
}

// Get webhook info (for debugging)
export function getWhatsAppWebhookInfo(req: Request, res: Response): void {
  res.json({
    status: 'active',
    verifyToken: VERIFY_TOKEN ? 'configured' : 'not configured',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'configured' : 'not configured',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'configured' : 'not configured',
  });
}
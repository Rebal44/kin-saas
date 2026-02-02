// src/services/whatsapp-unified.ts
// Unified WhatsApp service that uses either Business API or Twilio

import { whatsAppService } from './whatsapp';
import { whatsAppTwilioService } from './whatsapp-twilio';
import { logger } from '../utils';

export type WhatsAppProvider = 'business_api' | 'twilio';

class WhatsAppUnifiedService {
  private provider: WhatsAppProvider;

  constructor() {
    // Determine which provider to use based on env vars
    if (process.env.WHATSAPP_USE_TWILIO === 'true' || 
        (!process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.TWILIO_ACCOUNT_SID)) {
      this.provider = 'twilio';
      logger.info('Using Twilio for WhatsApp integration');
    } else {
      this.provider = 'business_api';
      logger.info('Using WhatsApp Business API for integration');
    }
  }

  getProvider(): WhatsAppProvider {
    return this.provider;
  }

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    if (this.provider === 'twilio') {
      return whatsAppTwilioService.sendTextMessage(to, text);
    }
    return whatsAppService.sendTextMessage(to, text);
  }

  async sendMediaMessage(to: string, mediaUrl: string, caption?: string): Promise<boolean> {
    if (this.provider === 'twilio') {
      return whatsAppTwilioService.sendMediaMessage(to, mediaUrl, caption);
    }
    return whatsAppService.sendImageMessage(to, mediaUrl, caption);
  }

  generateConnectionLink(connectionToken: string): string {
    if (this.provider === 'twilio') {
      return whatsAppTwilioService.generateConnectionLink(connectionToken);
    }
    
    // Business API uses standard wa.me links
    const phoneNumber = process.env.WHATSAPP_PHONE_NUMBER?.replace('+', '');
    if (!phoneNumber) return '';
    
    const message = `START ${connectionToken}`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  }
}

export const whatsAppUnifiedService = new WhatsAppUnifiedService();

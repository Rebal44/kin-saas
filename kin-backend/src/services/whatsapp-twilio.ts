// src/services/whatsapp-twilio.ts
// Alternative WhatsApp integration using Twilio (simpler than Business API)

import axios from 'axios';
import { logger } from '../utils';

const TWILIO_API_VERSION = '2010-04-01';

export class WhatsAppTwilioService {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private apiUrl: string;
  private enabled: boolean;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.apiUrl = `https://api.twilio.com/${TWILIO_API_VERSION}/Accounts/${this.accountSid}/Messages.json`;
    this.enabled = !!(this.accountSid && this.authToken && this.phoneNumber);

    if (this.enabled) {
      logger.info('Twilio WhatsApp service initialized');
    } else {
      logger.warn('Twilio WhatsApp credentials not configured');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    if (!this.enabled) {
      logger.info(`[MOCK Twilio] WhatsApp message to ${to}: ${text.substring(0, 50)}...`);
      return true;
    }

    // Format phone numbers with whatsapp: prefix
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = this.phoneNumber.startsWith('whatsapp:') 
      ? this.phoneNumber 
      : `whatsapp:${this.phoneNumber}`;

    try {
      const params = new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: text,
      });

      await axios.post(this.apiUrl, params.toString(), {
        auth: {
          username: this.accountSid,
          password: this.authToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      });

      logger.info(`Twilio WhatsApp message sent to ${to}`);
      return true;
    } catch (error: any) {
      logger.error('Error sending Twilio WhatsApp message:', error.response?.data || error.message);
      return false;
    }
  }

  async sendMediaMessage(
    to: string, 
    mediaUrl: string, 
    caption?: string
  ): Promise<boolean> {
    if (!this.enabled) {
      logger.info(`[MOCK Twilio] WhatsApp media to ${to}: ${mediaUrl}`);
      return true;
    }

    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = this.phoneNumber.startsWith('whatsapp:') 
      ? this.phoneNumber 
      : `whatsapp:${this.phoneNumber}`;

    try {
      const params = new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        MediaUrl: mediaUrl,
      });

      if (caption) {
        params.append('Body', caption);
      }

      await axios.post(this.apiUrl, params.toString(), {
        auth: {
          username: this.accountSid,
          password: this.authToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      });

      logger.info(`Twilio WhatsApp media sent to ${to}`);
      return true;
    } catch (error: any) {
      logger.error('Error sending Twilio WhatsApp media:', error.response?.data || error.message);
      return false;
    }
  }

  // Parse incoming Twilio webhook payload
  parseWebhookPayload(body: Record<string, any>): {
    from: string;
    body: string;
    messageSid: string;
    profileName?: string;
    waId?: string;
    numMedia: number;
    mediaUrls: string[];
  } | null {
    // Validate required fields
    if (!body.From || !body.Body === undefined) {
      return null;
    }

    const numMedia = parseInt(body.NumMedia || '0', 10);
    const mediaUrls: string[] = [];

    for (let i = 0; i < numMedia; i++) {
      const url = body[`MediaUrl${i}`];
      if (url) mediaUrls.push(url);
    }

    return {
      from: body.From.replace('whatsapp:', ''),
      body: body.Body || '',
      messageSid: body.MessageSid || body.SmsMessageSid,
      profileName: body.ProfileName,
      waId: body.WaId,
      numMedia,
      mediaUrls,
    };
  }

  // Verify Twilio request signature
  verifyWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, any>
  ): boolean {
    // In production, implement proper signature verification
    // https://www.twilio.com/docs/usage/security#validating-requests
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // TODO: Implement proper signature verification
    logger.warn('Twilio signature verification not implemented for production');
    return true;
  }

  // Generate connection link with pre-filled message
  generateConnectionLink(connectionToken: string): string {
    if (!this.enabled) {
      return '';
    }

    const phoneNumber = this.phoneNumber.replace('whatsapp:', '').replace('+', '');
    const message = `START ${connectionToken}`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  }
}

export const whatsAppTwilioService = new WhatsAppTwilioService();

import axios from 'axios';
import { logger, retryWithBackoff } from '../utils';
import { WhatsAppMessage } from '../types';

const WHATSAPP_API_VERSION = 'v18.0';

export class WhatsAppService {
  private apiUrl: string;
  private phoneNumberId: string;
  private accessToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.apiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${this.phoneNumberId}`;

    if (!this.phoneNumberId || !this.accessToken) {
      logger.warn('WhatsApp credentials not configured. Using mock mode.');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    // Mock mode for development
    if (!this.phoneNumberId || !this.accessToken) {
      logger.info(`[MOCK] WhatsApp message to ${to}: ${text}`);
      return true;
    }

    try {
      await retryWithBackoff(async () => {
        const response = await axios.post(
          `${this.apiUrl}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'text',
            text: { body: text },
          },
          { headers: this.getHeaders() }
        );
        return response.data;
      });

      logger.info(`WhatsApp message sent to ${to}`);
      return true;
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) {
      logger.info(`[MOCK] WhatsApp image to ${to}: ${imageUrl}`);
      return true;
    }

    try {
      await retryWithBackoff(async () => {
        const response = await axios.post(
          `${this.apiUrl}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'image',
            image: {
              link: imageUrl,
              ...(caption && { caption }),
            },
          },
          { headers: this.getHeaders() }
        );
        return response.data;
      });

      logger.info(`WhatsApp image sent to ${to}`);
      return true;
    } catch (error) {
      logger.error('Error sending WhatsApp image:', error);
      return false;
    }
  }

  async getMediaUrl(mediaId: string): Promise<string | null> {
    if (!this.phoneNumberId || !this.accessToken) {
      return null;
    }

    try {
      const response = await axios.get(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`,
        { headers: this.getHeaders() }
      );
      return response.data.url;
    } catch (error) {
      logger.error('Error getting media URL:', error);
      return null;
    }
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await axios.get(mediaUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Error downloading media:', error);
      return null;
    }
  }

  // Webhook verification for WhatsApp
  verifyWebhook(
    mode: string,
    token: string,
    challenge: string,
    verifyToken: string
  ): string | null {
    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('WhatsApp webhook verified');
      return challenge;
    }
    logger.warn('WhatsApp webhook verification failed');
    return null;
  }

  // Parse incoming webhook payload
  parseWebhookPayload(body: unknown): { messages: WhatsAppMessage[]; contacts: unknown[] } | null {
    try {
      const payload = body as { entry?: unknown[] };
      
      if (!payload.entry || !Array.isArray(payload.entry)) {
        return null;
      }

      const messages: WhatsAppMessage[] = [];
      const contacts: unknown[] = [];

      for (const entry of payload.entry) {
        const entryData = entry as { changes?: unknown[] };
        if (!entryData.changes) continue;

        for (const change of entryData.changes) {
          const changeData = change as { value?: { messages?: WhatsAppMessage[]; contacts?: unknown[] } };
          if (changeData.value?.messages) {
            messages.push(...changeData.value.messages);
          }
          if (changeData.value?.contacts) {
            contacts.push(...changeData.value.contacts);
          }
        }
      }

      return { messages, contacts };
    } catch (error) {
      logger.error('Error parsing webhook payload:', error);
      return null;
    }
  }
}

export const whatsAppService = new WhatsAppService();
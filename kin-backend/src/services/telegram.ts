import axios from 'axios';
import { logger, retryWithBackoff } from '../utils';
import { TelegramMessage } from '../types';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

export class TelegramService {
  private botToken: string;
  private apiUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.apiUrl = `${TELEGRAM_API_URL}${this.botToken}`;

    if (!this.botToken) {
      logger.warn('Telegram bot token not configured. Using mock mode.');
    }
  }

  async sendTextMessage(chatId: number | string, text: string): Promise<boolean> {
    // Mock mode for development
    if (!this.botToken) {
      logger.info(`[MOCK] Telegram message to ${chatId}: ${text}`);
      return true;
    }

    try {
      await retryWithBackoff(async () => {
        const response = await axios.post(`${this.apiUrl}/sendMessage`, {
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
        });
        return response.data;
      });

      logger.info(`Telegram message sent to ${chatId}`);
      return true;
    } catch (error) {
      logger.error('Error sending Telegram message:', error);
      return false;
    }
  }

  async sendPhoto(
    chatId: number | string,
    photoUrl: string,
    caption?: string
  ): Promise<boolean> {
    if (!this.botToken) {
      logger.info(`[MOCK] Telegram photo to ${chatId}: ${photoUrl}`);
      return true;
    }

    try {
      await retryWithBackoff(async () => {
        const response = await axios.post(`${this.apiUrl}/sendPhoto`, {
          chat_id: chatId,
          photo: photoUrl,
          ...(caption && { caption }),
        });
        return response.data;
      });

      logger.info(`Telegram photo sent to ${chatId}`);
      return true;
    } catch (error) {
      logger.error('Error sending Telegram photo:', error);
      return false;
    }
  }

  async sendVoice(
    chatId: number | string,
    voiceUrl: string,
    caption?: string
  ): Promise<boolean> {
    if (!this.botToken) {
      logger.info(`[MOCK] Telegram voice to ${chatId}: ${voiceUrl}`);
      return true;
    }

    try {
      await retryWithBackoff(async () => {
        const response = await axios.post(`${this.apiUrl}/sendVoice`, {
          chat_id: chatId,
          voice: voiceUrl,
          ...(caption && { caption }),
        });
        return response.data;
      });

      logger.info(`Telegram voice sent to ${chatId}`);
      return true;
    } catch (error) {
      logger.error('Error sending Telegram voice:', error);
      return false;
    }
  }

  async setWebhook(webhookUrl: string, secretToken?: string): Promise<boolean> {
    if (!this.botToken) {
      logger.info(`[MOCK] Set Telegram webhook: ${webhookUrl}`);
      return true;
    }

    try {
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url: webhookUrl,
        ...(secretToken && { secret_token: secretToken }),
      });

      if (response.data.ok) {
        logger.info('Telegram webhook set successfully');
        return true;
      } else {
        logger.error('Failed to set Telegram webhook:', response.data);
        return false;
      }
    } catch (error) {
      logger.error('Error setting Telegram webhook:', error);
      return false;
    }
  }

  async deleteWebhook(): Promise<boolean> {
    if (!this.botToken) {
      logger.info('[MOCK] Delete Telegram webhook');
      return true;
    }

    try {
      const response = await axios.post(`${this.apiUrl}/deleteWebhook`);
      return response.data.ok;
    } catch (error) {
      logger.error('Error deleting Telegram webhook:', error);
      return false;
    }
  }

  async getWebhookInfo(): Promise<unknown | null> {
    if (!this.botToken) {
      return null;
    }

    try {
      const response = await axios.post(`${this.apiUrl}/getWebhookInfo`);
      return response.data;
    } catch (error) {
      logger.error('Error getting webhook info:', error);
      return null;
    }
  }

  async getMe(): Promise<{ id: number; username: string } | null> {
    if (!this.botToken) {
      return { id: 0, username: 'mock_bot' };
    }

    try {
      const response = await axios.post(`${this.apiUrl}/getMe`);
      if (response.data.ok) {
        return {
          id: response.data.result.id,
          username: response.data.result.username,
        };
      }
      return null;
    } catch (error) {
      logger.error('Error getting bot info:', error);
      return null;
    }
  }

  async getFile(fileId: string): Promise<{ file_path?: string } | null> {
    if (!this.botToken) {
      return null;
    }

    try {
      const response = await axios.post(`${this.apiUrl}/getFile`, {
        file_id: fileId,
      });
      
      if (response.data.ok) {
        return response.data.result;
      }
      return null;
    } catch (error) {
      logger.error('Error getting file:', error);
      return null;
    }
  }

  getFileUrl(filePath: string): string {
    return `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
  }

  // Parse incoming webhook payload
  parseWebhookPayload(body: unknown): { message?: TelegramMessage; editedMessage?: TelegramMessage } | null {
    try {
      const payload = body as {
        message?: TelegramMessage;
        edited_message?: TelegramMessage;
      };

      return {
        message: payload.message,
        editedMessage: payload.edited_message,
      };
    } catch (error) {
      logger.error('Error parsing Telegram webhook:', error);
      return null;
    }
  }

  // Verify webhook secret token
  verifyWebhookSecret(token: string, expectedSecret: string): boolean {
    return token === expectedSecret;
  }

  // Extract text from message
  extractText(message: TelegramMessage): string | null {
    return message.text || message.caption || null;
  }

  // Check if message is a /start command
  isStartCommand(message: TelegramMessage): { isCommand: boolean; param?: string } {
    const text = message.text;
    if (!text) return { isCommand: false };

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      return {
        isCommand: true,
        param: parts[1],
      };
    }

    return { isCommand: false };
  }
}

export const telegramService = new TelegramService();
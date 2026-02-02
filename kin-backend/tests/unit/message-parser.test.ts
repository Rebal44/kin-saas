/**
 * Message Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type {
  WhatsAppWebhookPayload,
  TelegramWebhookPayload,
  IncomingMessage,
} from '../../src/types';

// Message parser class
class MessageParser {
  parseWhatsAppMessage(payload: WhatsAppWebhookPayload): IncomingMessage[] {
    const messages: IncomingMessage[] = [];
    
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        
        if (!value.messages) continue;
        
        for (const msg of value.messages) {
          const baseMessage: Partial<IncomingMessage> = {
            external_id: msg.id,
            platform: 'whatsapp',
            from_user: msg.from,
            created_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            metadata: {
              phone_number_id: value.metadata.phone_number_id,
            },
          };
          
          switch (msg.type) {
            case 'text':
              messages.push({
                ...baseMessage,
                message_type: 'text',
                content: msg.text?.body || '',
              } as IncomingMessage);
              break;
              
            case 'image':
              messages.push({
                ...baseMessage,
                message_type: 'image',
                content: '',
                media_url: msg.image?.id,
                caption: msg.image?.caption,
              } as IncomingMessage);
              break;
              
            case 'audio':
              messages.push({
                ...baseMessage,
                message_type: 'audio',
                content: '',
                media_url: msg.audio?.id,
              } as IncomingMessage);
              break;
              
            case 'video':
              messages.push({
                ...baseMessage,
                message_type: 'video',
                content: '',
                media_url: msg.video?.id,
                caption: msg.video?.caption,
              } as IncomingMessage);
              break;
              
            case 'document':
              messages.push({
                ...baseMessage,
                message_type: 'document',
                content: msg.document?.filename || '',
                media_url: msg.document?.id,
                caption: msg.document?.caption,
              } as IncomingMessage);
              break;
              
            case 'location':
              messages.push({
                ...baseMessage,
                message_type: 'location',
                content: `${msg.location?.latitude},${msg.location?.longitude}`,
                metadata: {
                  ...baseMessage.metadata,
                  location_name: msg.location?.name,
                  location_address: msg.location?.address,
                },
              } as IncomingMessage);
              break;
          }
        }
      }
    }
    
    return messages;
  }
  
  parseTelegramMessage(payload: TelegramWebhookPayload): IncomingMessage | null {
    const message = payload.message || payload.edited_message;
    
    if (!message) return null;
    
    const baseMessage: Partial<IncomingMessage> = {
      external_id: message.message_id.toString(),
      platform: 'telegram',
      from_user: message.chat.id.toString(),
      created_at: new Date(message.date * 1000).toISOString(),
      metadata: {
        chat_type: message.chat.type,
        from_username: message.from.username,
        from_first_name: message.from.first_name,
      },
    };
    
    // Text message
    if (message.text) {
      return {
        ...baseMessage,
        message_type: 'text',
        content: message.text,
      } as IncomingMessage;
    }
    
    // Photo
    if (message.photo && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1];
      return {
        ...baseMessage,
        message_type: 'image',
        content: '',
        media_url: largestPhoto.file_id,
        caption: message.caption,
      } as IncomingMessage;
    }
    
    // Voice message
    if (message.voice) {
      return {
        ...baseMessage,
        message_type: 'audio',
        content: '',
        media_url: message.voice.file_id,
      } as IncomingMessage;
    }
    
    // Document
    if (message.document) {
      return {
        ...baseMessage,
        message_type: 'document',
        content: message.document.file_name || '',
        media_url: message.document.file_id,
        caption: message.caption,
      } as IncomingMessage;
    }
    
    // Unknown type
    return {
      ...baseMessage,
      message_type: 'text',
      content: '',
      metadata: {
        ...baseMessage.metadata,
        unknown_type: true,
      },
    } as IncomingMessage;
  }
  
  validatePhoneNumber(phone: string): boolean {
    // E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }
  
  validateChatId(chatId: string): boolean {
    // Telegram chat ID validation (can be positive or negative for groups)
    const chatIdRegex = /^-?\d+$/;
    return chatIdRegex.test(chatId) && chatId !== '0';
  }
  
  formatPhoneForWhatsApp(phone: string): string {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }
  
  extractCommand(text: string): { command: string | null; args: string } {
    const match = text.match(/^\/([a-zA-Z0-9_]+)(?:\s+(.*))?$/);
    
    if (!match) {
      return { command: null, args: text };
    }
    
    return {
      command: match[1].toLowerCase(),
      args: match[2] || '',
    };
  }
  
  sanitizeMessage(text: string): string {
    // Remove potentially dangerous HTML/script tags
    return text
      .replace(/<script\b[^\u003c]*(?:(?!<\/script>)<[^\u003c]*)*<\/script>/gi, '')
      .replace(/<[^\u003e]+>/g, '') // Remove HTML tags
      .trim();
  }
  
  truncateMessage(text: string, maxLength = 4000): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

describe('Message Parser', () => {
  const parser = new MessageParser();
  
  describe('WhatsApp Message Parsing', () => {
    it('should parse text message', () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456789',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '987654321',
              },
              contacts: [{
                wa_id: '1234567890',
                profile: { name: 'Test User' },
              }],
              messages: [{
                from: '1234567890',
                id: 'wamid.1234567890',
                timestamp: '1704067200',
                type: 'text',
                text: { body: 'Hello, world!' },
              }],
            },
            field: 'messages',
          }],
        }],
      };
      
      const messages = parser.parseWhatsAppMessage(payload);
      
      expect(messages).toHaveLength(1);
      expect(messages[0].message_type).toBe('text');
      expect(messages[0].content).toBe('Hello, world!');
      expect(messages[0].platform).toBe('whatsapp');
    });
    
    it('should parse image message with caption', () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456789',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '987654321',
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.image123',
                timestamp: '1704067200',
                type: 'image',
                image: {
                  id: 'image_media_id',
                  caption: 'My vacation photo',
                  mime_type: 'image/jpeg',
                },
              }],
            },
            field: 'messages',
          }],
        }],
      };
      
      const messages = parser.parseWhatsAppMessage(payload);
      
      expect(messages).toHaveLength(1);
      expect(messages[0].message_type).toBe('image');
      expect(messages[0].media_url).toBe('image_media_id');
      expect(messages[0].caption).toBe('My vacation photo');
    });
    
    it('should parse audio message', () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456789',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '987654321',
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.audio123',
                timestamp: '1704067200',
                type: 'audio',
                audio: {
                  id: 'audio_media_id',
                  mime_type: 'audio/ogg',
                },
              }],
            },
            field: 'messages',
          }],
        }],
      };
      
      const messages = parser.parseWhatsAppMessage(payload);
      
      expect(messages).toHaveLength(1);
      expect(messages[0].message_type).toBe('audio');
      expect(messages[0].media_url).toBe('audio_media_id');
    });
    
    it('should parse location message', () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456789',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '987654321',
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.loc123',
                timestamp: '1704067200',
                type: 'location',
                location: {
                  latitude: 40.7128,
                  longitude: -74.006,
                  name: 'New York',
                  address: '123 Main St',
                },
              }],
            },
            field: 'messages',
          }],
        }],
      };
      
      const messages = parser.parseWhatsAppMessage(payload);
      
      expect(messages).toHaveLength(1);
      expect(messages[0].message_type).toBe('location');
      expect(messages[0].content).toBe('40.7128,-74.006');
      expect(messages[0].metadata?.location_name).toBe('New York');
    });
    
    it('should parse multiple messages', () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456789',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '987654321',
              },
              messages: [
                {
                  from: '1234567890',
                  id: 'wamid.msg1',
                  timestamp: '1704067200',
                  type: 'text',
                  text: { body: 'First message' },
                },
                {
                  from: '1234567890',
                  id: 'wamid.msg2',
                  timestamp: '1704067201',
                  type: 'text',
                  text: { body: 'Second message' },
                },
              ],
            },
            field: 'messages',
          }],
        }],
      };
      
      const messages = parser.parseWhatsAppMessage(payload);
      
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Second message');
    });
    
    it('should return empty array for non-message events', () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456789',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '987654321',
              },
              statuses: [{
                id: 'wamid.status123',
                recipient_id: '1234567890',
                status: 'delivered',
                timestamp: '1704067200',
              }],
            },
            field: 'messages',
          }],
        }],
      };
      
      const messages = parser.parseWhatsAppMessage(payload);
      
      expect(messages).toHaveLength(0);
    });
  });
  
  describe('Telegram Message Parsing', () => {
    it('should parse text message', () => {
      const payload: TelegramWebhookPayload = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Test',
            username: 'testuser',
          },
          chat: {
            id: 123456789,
            type: 'private',
            first_name: 'Test',
            username: 'testuser',
          },
          date: 1704067200,
          text: 'Hello from Telegram!',
        },
      };
      
      const message = parser.parseTelegramMessage(payload);
      
      expect(message).not.toBeNull();
      expect(message?.message_type).toBe('text');
      expect(message?.content).toBe('Hello from Telegram!');
      expect(message?.platform).toBe('telegram');
    });
    
    it('should parse photo message', () => {
      const payload: TelegramWebhookPayload = {
        update_id: 123456789,
        message: {
          message_id: 2,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Test',
          },
          chat: {
            id: 123456789,
            type: 'private',
          },
          date: 1704067200,
          photo: [
            { file_id: 'small', file_unique_id: 'small', width: 100, height: 100 },
            { file_id: 'medium', file_unique_id: 'medium', width: 300, height: 300 },
            { file_id: 'large', file_unique_id: 'large', width: 800, height: 800 },
          ],
          caption: 'Photo caption',
        },
      };
      
      const message = parser.parseTelegramMessage(payload);
      
      expect(message).not.toBeNull();
      expect(message?.message_type).toBe('image');
      expect(message?.media_url).toBe('large'); // Should use largest photo
      expect(message?.caption).toBe('Photo caption');
    });
    
    it('should parse voice message', () => {
      const payload: TelegramWebhookPayload = {
        update_id: 123456789,
        message: {
          message_id: 3,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Test',
          },
          chat: {
            id: 123456789,
            type: 'private',
          },
          date: 1704067200,
          voice: {
            file_id: 'voice_file_id',
            file_unique_id: 'voice_unique',
            duration: 10,
            mime_type: 'audio/ogg',
          },
        },
      };
      
      const message = parser.parseTelegramMessage(payload);
      
      expect(message).not.toBeNull();
      expect(message?.message_type).toBe('audio');
      expect(message?.media_url).toBe('voice_file_id');
    });
    
    it('should parse edited message', () => {
      const payload: TelegramWebhookPayload = {
        update_id: 123456789,
        edited_message: {
          message_id: 4,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Test',
          },
          chat: {
            id: 123456789,
            type: 'private',
          },
          date: 1704067200,
          text: 'Edited message',
        },
      };
      
      const message = parser.parseTelegramMessage(payload);
      
      expect(message).not.toBeNull();
      expect(message?.content).toBe('Edited message');
    });
    
    it('should return null for non-message updates', () => {
      const payload: TelegramWebhookPayload = {
        update_id: 123456789,
        callback_query: {
          id: 'query_id',
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Test',
          },
          data: 'button_clicked',
        },
      };
      
      const message = parser.parseTelegramMessage(payload);
      
      expect(message).toBeNull();
    });
  });
  
  describe('Phone Number Validation', () => {
    it('should validate valid E.164 phone numbers', () => {
      expect(parser.validatePhoneNumber('+1234567890')).toBe(true);
      expect(parser.validatePhoneNumber('+441234567890')).toBe(true);
      expect(parser.validatePhoneNumber('+919876543210')).toBe(true);
      expect(parser.validatePhoneNumber('+123456789012345')).toBe(true);
    });
    
    it('should reject invalid phone numbers', () => {
      expect(parser.validatePhoneNumber('1234567890')).toBe(false); // Missing +
      expect(parser.validatePhoneNumber('+')).toBe(false); // Just +
      expect(parser.validatePhoneNumber('+abc')).toBe(false); // Non-numeric
      expect(parser.validatePhoneNumber('+0')).toBe(false); // Starts with 0
      expect(parser.validatePhoneNumber('')).toBe(false); // Empty
    });
  });
  
  describe('Chat ID Validation', () => {
    it('should validate valid chat IDs', () => {
      expect(parser.validateChatId('123456789')).toBe(true);
      expect(parser.validateChatId('-1001234567890')).toBe(true);
      expect(parser.validateChatId('999999999')).toBe(true);
    });
    
    it('should reject invalid chat IDs', () => {
      expect(parser.validateChatId('')).toBe(false);
      expect(parser.validateChatId('0')).toBe(false);
      expect(parser.validateChatId('abc')).toBe(false);
      expect(parser.validateChatId('12.34')).toBe(false);
    });
  });
  
  describe('Phone Number Formatting', () => {
    it('should format phone numbers correctly', () => {
      expect(parser.formatPhoneForWhatsApp('1234567890')).toBe('+1234567890');
      expect(parser.formatPhoneForWhatsApp('+1234567890')).toBe('+1234567890');
      expect(parser.formatPhoneForWhatsApp('(123) 456-7890')).toBe('+1234567890');
      expect(parser.formatPhoneForWhatsApp('123-456-7890')).toBe('+1234567890');
    });
  });
  
  describe('Command Extraction', () => {
    it('should extract commands from messages', () => {
      expect(parser.extractCommand('/start')).toEqual({ command: 'start', args: '' });
      expect(parser.extractCommand('/help')).toEqual({ command: 'help', args: '' });
      expect(parser.extractCommand('/schedule meeting tomorrow')).toEqual({ command: 'schedule', args: 'meeting tomorrow' });
      expect(parser.extractCommand('/remind buy milk at 5pm')).toEqual({ command: 'remind', args: 'buy milk at 5pm' });
    });
    
    it('should return null command for non-commands', () => {
      expect(parser.extractCommand('Hello bot')).toEqual({ command: null, args: 'Hello bot' });
      expect(parser.extractCommand('What time is it?')).toEqual({ command: null, args: 'What time is it?' });
    });
    
    it('should handle command case insensitively', () => {
      expect(parser.extractCommand('/START')).toEqual({ command: 'start', args: '' });
      expect(parser.extractCommand('/Start')).toEqual({ command: 'start', args: '' });
    });
  });
  
  describe('Message Sanitization', () => {
    it('should remove script tags', () => {
      expect(parser.sanitizeMessage('<script>alert("xss")</script>Hello'))
        .toBe('Hello');
    });
    
    it('should remove HTML tags', () => {
      expect(parser.sanitizeMessage('<b>Bold</b> text'))
        .toBe('Bold text');
    });
    
    it('should trim whitespace', () => {
      expect(parser.sanitizeMessage('  Hello  ')).toBe('Hello');
    });
  });
  
  describe('Message Truncation', () => {
    it('should not truncate short messages', () => {
      const text = 'Short message';
      expect(parser.truncateMessage(text, 100)).toBe(text);
    });
    
    it('should truncate long messages', () => {
      const longText = 'a'.repeat(5000);
      const truncated = parser.truncateMessage(longText);
      
      expect(truncated.length).toBeLessThan(longText.length);
      expect(truncated.endsWith('...')).toBe(true);
    });
    
    it('should respect custom max length', () => {
      const text = 'a'.repeat(100);
      const truncated = parser.truncateMessage(text, 50);
      
      expect(truncated.length).toBe(50);
      expect(truncated.endsWith('...')).toBe(true);
    });
  });
});

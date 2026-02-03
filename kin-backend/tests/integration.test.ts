import { describe, it, expect, beforeEach, vi } from 'vitest';
import { messageRelayService } from '../src/services/messageRelay';
import { kinAiRelayService } from '../src/services/kinAi';
import { whatsAppService } from '../src/services/whatsapp';
import { telegramService } from '../src/services/telegram';

// Mock all dependencies
vi.mock('../src/db', () => ({
  getBotConnectionByPlatformAndIdentifier: vi.fn(),
  createBotConnection: vi.fn(),
  saveIncomingMessage: vi.fn(),
  saveOutgoingMessage: vi.fn(),
  updateOutgoingMessageStatus: vi.fn(),
  getOrCreateConversation: vi.fn(),
  addConversationMessage: vi.fn(),
  getConversationHistory: vi.fn(),
  markConnectionAsConnected: vi.fn(),
}));

vi.mock('../src/utils', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  retryWithBackoff: vi.fn((fn) => fn()),
}));

import * as db from '../src/db';

describe('Message Relay Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processWhatsAppMessage', () => {
    it('should handle new user without connection', async () => {
      vi.mocked(db.getBotConnectionByPlatformAndIdentifier).mockResolvedValue(null);
      vi.mocked(db.createBotConnection).mockResolvedValue({
        id: 'conn_123',
        user_id: 'pending',
        platform: 'whatsapp',
        is_connected: false,
      } as any);

      const sendMessageSpy = vi.spyOn(whatsAppService, 'sendTextMessage').mockResolvedValue(true);

      const message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text' as const,
        text: { body: 'Hello!' },
      };

      await messageRelayService.processWhatsAppMessage(message, 'phone_123');

      expect(db.createBotConnection).toHaveBeenCalled();
      expect(sendMessageSpy).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('Welcome to Kin')
      );
    });

    it('should process message from connected user', async () => {
      const mockConnection = {
        id: 'conn_123',
        user_id: 'user_123',
        platform: 'whatsapp',
        phone_number: '1234567890',
        is_connected: true,
      };

      vi.mocked(db.getBotConnectionByPlatformAndIdentifier).mockResolvedValue(mockConnection as any);
      vi.mocked(db.saveIncomingMessage).mockResolvedValue({ id: 'msg_db_123' } as any);
      vi.mocked(db.getOrCreateConversation).mockResolvedValue({ id: 'conv_123' } as any);
      vi.mocked(db.saveOutgoingMessage).mockResolvedValue({ id: 'out_123' } as any);
      vi.mocked(kinAiRelayService.sendMessage).mockResolvedValue({
        message: 'Hello! How can I help?',
      });

      const sendMessageSpy = vi.spyOn(whatsAppService, 'sendTextMessage').mockResolvedValue(true);

      const message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text' as const,
        text: { body: 'Hello!' },
      };

      await messageRelayService.processWhatsAppMessage(message, 'phone_123');

      expect(db.saveIncomingMessage).toHaveBeenCalled();
      expect(kinAiRelayService.sendMessage).toHaveBeenCalled();
      expect(sendMessageSpy).toHaveBeenCalledWith('1234567890', 'Hello! How can I help?');
    });
  });

  describe('processTelegramMessage', () => {
    it('should handle /start command with token', async () => {
      const message = {
        message_id: 123,
        from: {
          id: 456,
          is_bot: false,
          first_name: 'Test',
        },
        chat: {
          id: 456,
          type: 'private' as const,
        },
        date: 1234567890,
        text: '/start conn_token_123',
      };

      vi.spyOn(telegramService, 'isStartCommand').mockReturnValue({
        isCommand: true,
        param: 'conn_token_123',
      });

      const sendMessageSpy = vi.spyOn(telegramService, 'sendTextMessage').mockResolvedValue(true);

      await messageRelayService.processTelegramMessage(message);

      expect(sendMessageSpy).toHaveBeenCalledWith(
        456,
        expect.stringContaining('Connected successfully')
      );
    });

    it('should process regular message from connected user', async () => {
      const mockConnection = {
        id: 'conn_123',
        user_id: 'user_123',
        platform: 'telegram',
        chat_id: '456',
        is_connected: true,
      };

      vi.mocked(db.getBotConnectionByPlatformAndIdentifier).mockResolvedValue(mockConnection as any);
      vi.mocked(db.saveIncomingMessage).mockResolvedValue({ id: 'msg_db_123' } as any);
      vi.mocked(db.getOrCreateConversation).mockResolvedValue({ id: 'conv_123' } as any);
      vi.mocked(db.saveOutgoingMessage).mockResolvedValue({ id: 'out_123' } as any);
      vi.mocked(kinAiRelayService.sendMessage).mockResolvedValue({
        message: 'Got your message!',
      });

      const sendMessageSpy = vi.spyOn(telegramService, 'sendTextMessage').mockResolvedValue(true);

      const message = {
        message_id: 123,
        from: {
          id: 456,
          is_bot: false,
          first_name: 'Test',
        },
        chat: {
          id: 456,
          type: 'private' as const,
        },
        date: 1234567890,
        text: 'Hello bot!',
      };

      await messageRelayService.processTelegramMessage(message);

      expect(db.saveIncomingMessage).toHaveBeenCalled();
      expect(kinAiRelayService.sendMessage).toHaveBeenCalled();
      expect(sendMessageSpy).toHaveBeenCalledWith(456, 'Got your message!');
    });
  });
});

describe('Kin AI Relay Service', () => {
  describe('sendMessage', () => {
    it('should return mock response in mock mode', async () => {
      const response = await kinAiRelayService.sendMessage({
        message: 'Hello',
        user_id: 'user_123',
        conversation_id: 'conv_123',
        platform: 'whatsapp',
      });

      expect(response.message).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it('should generate appropriate mock responses', async () => {
      const greetings = await kinAiRelayService.sendMessage({
        message: 'hello',
        user_id: 'user_123',
        conversation_id: 'conv_123',
        platform: 'whatsapp',
      });
      expect(greetings.message).toContain('Hello');

      const help = await kinAiRelayService.sendMessage({
        message: 'help',
        user_id: 'user_123',
        conversation_id: 'conv_123',
        platform: 'whatsapp',
      });
      expect(help.message).toContain('help');
    });
  });
});

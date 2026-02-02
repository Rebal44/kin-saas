/**
 * Mock Bot Connections for Testing
 */

import type { BotConnection, Platform } from '../../src/types';

export const mockWhatsAppConnection: BotConnection = {
  id: 'conn_whatsapp_001',
  user_id: 'user_test123',
  platform: 'whatsapp',
  phone_number: '+1234567890',
  chat_id: undefined,
  username: undefined,
  is_connected: true,
  connected_at: '2024-01-01T00:00:00Z',
  disconnected_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockTelegramConnection: BotConnection = {
  id: 'conn_telegram_001',
  user_id: 'user_test123',
  platform: 'telegram',
  phone_number: undefined,
  chat_id: '123456789',
  username: 'testuser',
  is_connected: true,
  connected_at: '2024-01-01T00:00:00Z',
  disconnected_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockDisconnectedConnection: BotConnection = {
  id: 'conn_disconnected_001',
  user_id: 'user_test456',
  platform: 'whatsapp',
  phone_number: '+9876543210',
  chat_id: undefined,
  username: undefined,
  is_connected: false,
  connected_at: '2024-01-01T00:00:00Z',
  disconnected_at: '2024-01-15T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

export const mockPendingConnection: BotConnection = {
  id: 'conn_pending_001',
  user_id: 'user_test789',
  platform: 'telegram',
  phone_number: undefined,
  chat_id: undefined,
  username: undefined,
  is_connected: false,
  connected_at: undefined,
  disconnected_at: undefined,
  created_at: '2024-01-20T00:00:00Z',
  updated_at: '2024-01-20T00:00:00Z',
};

// Mock QR code data
export const mockQRCodeData = {
  whatsapp: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  telegram: 'https://t.me/KinTestBot?start=abc123def456',
};

// Connection states for testing
export const connectionStates = {
  connected: mockWhatsAppConnection,
  disconnected: mockDisconnectedConnection,
  pending: mockPendingConnection,
  telegram: mockTelegramConnection,
};

// Mock connection responses
export const mockConnectionLinkResponse = {
  whatsapp: {
    connection_id: 'conn_whatsapp_new',
    qr_code_url: mockQRCodeData.whatsapp,
    platform: 'whatsapp' as Platform,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
  },
  telegram: {
    connection_id: 'conn_telegram_new',
    bot_link: mockQRCodeData.telegram,
    platform: 'telegram' as Platform,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  },
};

// Test phone numbers
export const testPhoneNumbers = {
  valid: ['+1234567890', '+441234567890', '+919876543210'],
  invalid: ['12345', 'abc', '+', '++1234567890', '12345678901234567890'],
};

// Test chat IDs
export const testChatIds = {
  valid: ['123456789', '-1001234567890', '999999999'],
  invalid: ['', 'abc', '0', '-1'],
};

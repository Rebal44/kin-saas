/**
 * Mock Conversations for Testing
 */

import type {
  Conversation,
  ConversationMessage,
  IncomingMessage,
  OutgoingMessage,
} from '../../src/types';

// Mock users
export const mockUsers = {
  active: {
    id: 'user_active_001',
    email: 'active@example.com',
    clerk_id: 'clerk_active_001',
    stripe_customer_id: 'cus_active_001',
    subscription_status: 'active' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  trialing: {
    id: 'user_trial_001',
    email: 'trial@example.com',
    clerk_id: 'clerk_trial_001',
    stripe_customer_id: 'cus_trial_001',
    subscription_status: 'trialing' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  inactive: {
    id: 'user_inactive_001',
    email: 'inactive@example.com',
    clerk_id: 'clerk_inactive_001',
    stripe_customer_id: undefined,
    subscription_status: 'inactive' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  canceled: {
    id: 'user_canceled_001',
    email: 'canceled@example.com',
    clerk_id: 'clerk_canceled_001',
    stripe_customer_id: 'cus_canceled_001',
    subscription_status: 'canceled' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
};

// Mock conversation messages
export const mockMessages: ConversationMessage[] = [
  {
    id: 'msg_001',
    conversation_id: 'conv_001',
    role: 'user',
    content: 'Hello, can you help me with something?',
    message_type: 'text',
    incoming_message_id: 'incoming_001',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'msg_002',
    conversation_id: 'conv_001',
    role: 'assistant',
    content: 'Of course! I\'d be happy to help. What do you need assistance with?',
    message_type: 'text',
    outgoing_message_id: 'outgoing_001',
    created_at: '2024-01-15T10:00:05Z',
  },
  {
    id: 'msg_003',
    conversation_id: 'conv_001',
    role: 'user',
    content: 'I need help scheduling a meeting',
    message_type: 'text',
    incoming_message_id: 'incoming_002',
    created_at: '2024-01-15T10:00:30Z',
  },
  {
    id: 'msg_004',
    conversation_id: 'conv_001',
    role: 'assistant',
    content: 'I can help with that. What date and time works for you?',
    message_type: 'text',
    outgoing_message_id: 'outgoing_002',
    created_at: '2024-01-15T10:00:35Z',
  },
];

// Mock conversations
export const mockConversations: Conversation[] = [
  {
    id: 'conv_001',
    user_id: 'user_active_001',
    connection_id: 'conn_whatsapp_001',
    platform: 'whatsapp',
    messages: mockMessages,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:35Z',
  },
  {
    id: 'conv_002',
    user_id: 'user_active_001',
    connection_id: 'conn_telegram_001',
    platform: 'telegram',
    messages: [],
    created_at: '2024-01-16T14:00:00Z',
    updated_at: '2024-01-16T14:00:00Z',
  },
];

// Mock incoming messages
export const mockIncomingMessages: IncomingMessage[] = [
  {
    id: 'incoming_001',
    connection_id: 'conn_whatsapp_001',
    platform: 'whatsapp',
    external_id: 'wamid.1234567890',
    from_user: '+1234567890',
    message_type: 'text',
    content: 'Hello, can you help me with something?',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'incoming_002',
    connection_id: 'conn_whatsapp_001',
    platform: 'whatsapp',
    external_id: 'wamid.1234567891',
    from_user: '+1234567890',
    message_type: 'text',
    content: 'I need help scheduling a meeting',
    created_at: '2024-01-15T10:00:30Z',
  },
  {
    id: 'incoming_image_001',
    connection_id: 'conn_telegram_001',
    platform: 'telegram',
    external_id: '12345',
    from_user: '123456789',
    message_type: 'image',
    content: '',
    media_url: 'https://example.com/image.jpg',
    caption: 'Check out this image',
    created_at: '2024-01-16T15:00:00Z',
  },
  {
    id: 'incoming_audio_001',
    connection_id: 'conn_whatsapp_001',
    platform: 'whatsapp',
    external_id: 'wamid.1234567892',
    from_user: '+1234567890',
    message_type: 'audio',
    content: '',
    media_url: 'https://example.com/audio.ogg',
    created_at: '2024-01-17T09:00:00Z',
  },
];

// Mock outgoing messages
export const mockOutgoingMessages: OutgoingMessage[] = [
  {
    id: 'outgoing_001',
    connection_id: 'conn_whatsapp_001',
    platform: 'whatsapp',
    to_user: '+1234567890',
    message_type: 'text',
    content: 'Of course! I\'d be happy to help. What do you need assistance with?',
    status: 'delivered',
    created_at: '2024-01-15T10:00:05Z',
    sent_at: '2024-01-15T10:00:06Z',
  },
  {
    id: 'outgoing_002',
    connection_id: 'conn_whatsapp_001',
    platform: 'whatsapp',
    to_user: '+1234567890',
    message_type: 'text',
    content: 'I can help with that. What date and time works for you?',
    status: 'read',
    created_at: '2024-01-15T10:00:35Z',
    sent_at: '2024-01-15T10:00:36Z',
  },
  {
    id: 'outgoing_pending_001',
    connection_id: 'conn_telegram_001',
    platform: 'telegram',
    to_user: '123456789',
    message_type: 'text',
    content: 'This message is pending',
    status: 'pending',
    created_at: '2024-01-16T15:05:00Z',
  },
  {
    id: 'outgoing_failed_001',
    connection_id: 'conn_whatsapp_001',
    platform: 'whatsapp',
    to_user: '+1234567890',
    message_type: 'text',
    content: 'This message failed to send',
    status: 'failed',
    error_message: 'Network error',
    created_at: '2024-01-17T10:00:00Z',
    sent_at: undefined,
  },
];

// Test message content
export const testMessageContent = {
  valid: [
    'Hello world',
    'How are you today?',
    'Can you help me with this task?',
    'Schedule a meeting for tomorrow at 2pm',
    'What\'s the weather like?',
  ],
  long: 'a'.repeat(4000), // Near the limit
  veryLong: 'a'.repeat(5000), // Over the limit
  empty: '',
  whitespaceOnly: '   ',
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  unicode: 'Hello 世界 🌍 Привет मनम',
  code: '```javascript\nconsole.log("Hello");\n```',
};

// OpenClaw relay responses
export const mockOpenClawResponses = {
  success: {
    message: 'I\'d be happy to help with that! Here\'s what I can do...',
    metadata: {
      tokens_used: 150,
      model: 'gpt-4',
    },
  },
  error: {
    message: '',
    error: 'Service temporarily unavailable',
    metadata: {},
  },
  rateLimited: {
    message: '',
    error: 'Rate limit exceeded. Please try again in a moment.',
    metadata: {
      retry_after: 60,
    },
  },
};

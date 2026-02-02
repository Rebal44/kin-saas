// User and Authentication Types
export interface User {
  id: string;
  email: string;
  clerk_id: string;
  stripe_customer_id?: string;
  subscription_status: 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due';
  created_at: string;
  updated_at: string;
}

// Bot Connection Types
export type Platform = 'whatsapp' | 'telegram';

export interface BotConnection {
  id: string;
  user_id: string;
  platform: Platform;
  phone_number?: string;
  chat_id?: string;
  username?: string;
  is_connected: boolean;
  connected_at?: string;
  disconnected_at?: string;
  created_at: string;
  updated_at: string;
}

// Message Types
export interface IncomingMessage {
  id: string;
  connection_id: string;
  platform: Platform;
  external_id: string;
  from_user: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
  content: string;
  media_url?: string;
  caption?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface OutgoingMessage {
  id: string;
  connection_id: string;
  platform: Platform;
  to_user: string;
  message_type: 'text' | 'image' | 'audio';
  content: string;
  media_url?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  error_message?: string;
  created_at: string;
  sent_at?: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  user_id: string;
  connection_id: string;
  platform: Platform;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: 'text' | 'image' | 'audio';
  incoming_message_id?: string;
  outgoing_message_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// WhatsApp Specific Types
export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppContact {
  wa_id: string;
  profile: {
    name: string;
  };
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type: string };
  audio?: { id: string; mime_type: string };
  video?: { id: string; caption?: string; mime_type: string };
  document?: { id: string; caption?: string; filename: string; mime_type: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
}

export interface WhatsAppStatus {
  id: string;
  recipient_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

// Telegram Specific Types
export interface TelegramWebhookPayload {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  voice?: TelegramVoice;
  document?: TelegramDocument;
  caption?: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// OpenClaw Relay Types
export interface OpenClawRequest {
  message: string;
  user_id: string;
  conversation_id: string;
  platform: Platform;
  metadata?: Record<string, unknown>;
}

export interface OpenClawResponse {
  message: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ConnectionLinkResponse {
  connection_id: string;
  qr_code_url?: string;
  bot_link?: string;
  platform: Platform;
  expires_at: string;
}

export interface WebhookVerificationResponse {
  challenge?: string;
  status: 'verified' | 'failed';
}
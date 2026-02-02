/**
 * Kin Database Types
 * TypeScript definitions matching Supabase PostgreSQL schema
 */

// ============================================
// ENUM TYPES
// ============================================

export type SubscriptionStatus = 'active' | 'trialing' | 'canceled';
export type Platform = 'whatsapp' | 'telegram';
export type MessageDirection = 'inbound' | 'outbound';
export type ActionType = 'message' | 'call' | 'task';

// ============================================
// CORE ENTITY TYPES
// ============================================

/**
 * User entity - Core user account
 */
export interface User {
  id: string; // UUID
  email: string;
  name: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Subscription entity - Stripe subscription data
 */
export interface Subscription {
  id: string; // UUID
  user_id: string; // UUID reference to users.id
  stripe_subscription_id: string;
  status: string;
  current_period_start: string | null; // ISO 8601 timestamp
  current_period_end: string | null; // ISO 8601 timestamp
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * BotConnection entity - WhatsApp/Telegram connections
 */
export interface BotConnection {
  id: string; // UUID
  user_id: string; // UUID reference to users.id
  platform: Platform;
  external_id: string; // phone number or chat_id
  connected_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Conversation entity - Message history
 */
export interface Conversation {
  id: string; // UUID
  user_id: string; // UUID reference to users.id
  bot_connection_id: string | null; // UUID reference to bot_connections.id
  direction: MessageDirection;
  message: string;
  metadata: ConversationMetadata;
  created_at: string;
}

/**
 * Metadata for conversations (JSONB)
 */
export interface ConversationMetadata {
  attachments?: Array<{
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    filename?: string;
    mimeType?: string;
    size?: number;
  }>;
  reply_to?: string; // message_id being replied to
  forwarded?: boolean;
  edited?: boolean;
  [key: string]: unknown; // Allow extensibility
}

/**
 * UsageLog entity - Credit tracking
 */
export interface UsageLog {
  id: string; // UUID
  user_id: string; // UUID reference to users.id
  action_type: ActionType;
  credits_used: number;
  created_at: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Auth: Register request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

/**
 * Auth: Register response
 */
export interface RegisterResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Auth: Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Auth: Login response
 */
export interface LoginResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * User profile response
 */
export interface UserMeResponse {
  user: User;
  subscription: Subscription | null;
  connections_count: number;
}

/**
 * Connections list response
 */
export interface ConnectionsResponse {
  connections: BotConnection[];
}

/**
 * Connect WhatsApp request
 */
export interface ConnectWhatsAppRequest {
  phone_number: string;
  verification_code?: string;
}

/**
 * Connect Telegram request
 */
export interface ConnectTelegramRequest {
  chat_id: string;
  username?: string;
}

/**
 * Connection response
 */
export interface ConnectionResponse {
  connection: BotConnection;
  message: string;
}

/**
 * Conversations query params
 */
export interface ConversationsQueryParams {
  limit?: number;
  offset?: number;
  bot_connection_id?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Conversations list response
 */
export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  has_more: boolean;
}

/**
 * Usage query params
 */
export interface UsageQueryParams {
  start_date?: string;
  end_date?: string;
  action_type?: ActionType;
}

/**
 * Usage response
 */
export interface UsageResponse {
  logs: UsageLog[];
  total_credits: number;
  summary: {
    messages: number;
    calls: number;
    tasks: number;
  };
}

// ============================================
// DATABASE INSERT TYPES (Omit auto-generated fields)
// ============================================

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;

export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
export type SubscriptionUpdate = Partial<Omit<Subscription, 'id' | 'created_at' | 'updated_at'>>;

export type BotConnectionInsert = Omit<BotConnection, 'id' | 'connected_at' | 'created_at' | 'updated_at'>;
export type BotConnectionUpdate = Partial<Omit<BotConnection, 'id' | 'created_at' | 'updated_at'>>;

export type ConversationInsert = Omit<Conversation, 'id' | 'created_at'>;

export type UsageLogInsert = Omit<UsageLog, 'id' | 'created_at'>;

// ============================================
// SUPABASE CLIENT TYPES
// ============================================

/**
 * Database schema type for Supabase client
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      subscriptions: {
        Row: Subscription;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
      };
      bot_connections: {
        Row: BotConnection;
        Insert: BotConnectionInsert;
        Update: BotConnectionUpdate;
      };
      conversations: {
        Row: Conversation;
        Insert: ConversationInsert;
        Update: never; // Conversations typically immutable
      };
      usage_logs: {
        Row: UsageLog;
        Insert: UsageLogInsert;
        Update: never; // Usage logs immutable
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      subscription_status: SubscriptionStatus;
      platform: Platform;
      message_direction: MessageDirection;
      action_type: ActionType;
    };
  };
}

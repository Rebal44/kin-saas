import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  User,
  BotConnection,
  IncomingMessage,
  OutgoingMessage,
  Conversation,
  ConversationMessage,
  Platform,
} from '../types';

// Database singleton
let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Service Key must be set in environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabase;
}

// User Operations
export async function getUserById(id: string): Promise<User | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data as User;
}

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (error) {
    console.error('Error fetching user by clerk ID:', error);
    return null;
  }

  return data as User;
}

export async function createUser(user: Partial<User>): Promise<User | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .insert([user])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data as User;
}

// Bot Connection Operations
export async function getBotConnectionById(id: string): Promise<BotConnection | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bot_connections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching bot connection:', error);
    return null;
  }

  return data as BotConnection;
}

export async function getBotConnectionByPlatformAndIdentifier(
  platform: Platform,
  identifier: string
): Promise<BotConnection | null> {
  const client = getSupabaseClient();
  const field = platform === 'whatsapp' ? 'phone_number' : 'chat_id';
  
  const { data, error } = await client
    .from('bot_connections')
    .select('*')
    .eq('platform', platform)
    .eq(field, identifier)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // No rows returned
      console.error('Error fetching bot connection by identifier:', error);
    }
    return null;
  }

  return data as BotConnection;
}

export async function getBotConnectionsByUserId(userId: string): Promise<BotConnection[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bot_connections')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching bot connections:', error);
    return [];
  }

  return data as BotConnection[];
}

export async function createBotConnection(
  connection: Partial<BotConnection>
): Promise<BotConnection | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bot_connections')
    .insert([connection])
    .select()
    .single();

  if (error) {
    console.error('Error creating bot connection:', error);
    return null;
  }

  return data as BotConnection;
}

export async function updateBotConnection(
  id: string,
  updates: Partial<BotConnection>
): Promise<BotConnection | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bot_connections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bot connection:', error);
    return null;
  }

  return data as BotConnection;
}

export async function markConnectionAsConnected(
  id: string,
  identifier: string
): Promise<BotConnection | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bot_connections')
    .update({
      is_connected: true,
      connected_at: new Date().toISOString(),
      ...(identifier.match(/^\d+$/) ? { chat_id: identifier } : { phone_number: identifier }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error marking connection as connected:', error);
    return null;
  }

  return data as BotConnection;
}

// Incoming Message Operations
export async function saveIncomingMessage(
  message: Partial<IncomingMessage>
): Promise<IncomingMessage | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('incoming_messages')
    .insert([message])
    .select()
    .single();

  if (error) {
    console.error('Error saving incoming message:', error);
    return null;
  }

  return data as IncomingMessage;
}

// Outgoing Message Operations
export async function saveOutgoingMessage(
  message: Partial<OutgoingMessage>
): Promise<OutgoingMessage | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('outgoing_messages')
    .insert([message])
    .select()
    .single();

  if (error) {
    console.error('Error saving outgoing message:', error);
    return null;
  }

  return data as OutgoingMessage;
}

export async function updateOutgoingMessageStatus(
  id: string,
  status: OutgoingMessage['status'],
  errorMessage?: string
): Promise<void> {
  const client = getSupabaseClient();
  const updates: Partial<OutgoingMessage> = { status };
  
  if (status === 'sent') {
    updates.sent_at = new Date().toISOString();
  }
  
  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  const { error } = await client
    .from('outgoing_messages')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating outgoing message status:', error);
  }
}

// Conversation Operations
export async function getOrCreateConversation(
  userId: string,
  connectionId: string,
  platform: Platform
): Promise<Conversation | null> {
  const client = getSupabaseClient();
  
  // Try to find existing conversation
  const { data: existing, error: findError } = await client
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('connection_id', connectionId)
    .single();

  if (existing) {
    return existing as Conversation;
  }

  // Create new conversation
  const { data, error } = await client
    .from('conversations')
    .insert([{
      user_id: userId,
      connection_id: connectionId,
      platform,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }

  return data as Conversation;
}

export async function addConversationMessage(
  message: Partial<ConversationMessage>
): Promise<ConversationMessage | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('conversation_messages')
    .insert([message])
    .select()
    .single();

  if (error) {
    console.error('Error adding conversation message:', error);
    return null;
  }

  return data as ConversationMessage;
}

export async function getConversationHistory(
  conversationId: string,
  limit: number = 50
): Promise<ConversationMessage[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }

  return (data as ConversationMessage[]).reverse();
}
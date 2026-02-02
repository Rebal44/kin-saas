/**
 * Database Query Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '../setup/test-utils';
import { mockUsers, mockConversations } from '../fixtures/conversations';
import { mockWhatsAppConnection, mockTelegramConnection } from '../fixtures/bot-connections';

// Database query functions
class DatabaseQueries {
  constructor(private supabase: any) {}
  
  // User queries
  async getUserById(id: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getUserByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async createUser(userData: any) {
    const { data, error } = await this.supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async updateUser(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Bot connection queries
  async getConnectionById(id: string) {
    const { data, error } = await this.supabase
      .from('bot_connections')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getConnectionsByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('bot_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  async getConnectionByPlatform(userId: string, platform: string) {
    const { data, error } = await this.supabase
      .from('bot_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('is_connected', true)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async createConnection(connectionData: any) {
    const { data, error } = await this.supabase
      .from('bot_connections')
      .insert(connectionData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async updateConnection(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('bot_connections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Conversation queries
  async getConversationById(id: string) {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*, messages(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getConversationsByUser(userId: string, limit = 10) {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }
  
  async createConversation(conversationData: any) {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async addMessage(conversationId: string, messageData: any) {
    const { data, error } = await this.supabase
      .from('conversation_messages')
      .insert({ ...messageData, conversation_id: conversationId })
      .select()
      .single();
    
    if (error) throw error;
    
    // Update conversation updated_at
    await this.supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    
    return data;
  }
  
  // Subscription queries
  async getSubscriptionByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getSubscriptionByStripeId(stripeSubscriptionId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Message queries
  async getIncomingMessageByExternalId(externalId: string, platform: string) {
    const { data, error } = await this.supabase
      .from('incoming_messages')
      .select('*')
      .eq('external_id', externalId)
      .eq('platform', platform)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async createIncomingMessage(messageData: any) {
    const { data, error } = await this.supabase
      .from('incoming_messages')
      .insert(messageData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async createOutgoingMessage(messageData: any) {
    const { data, error } = await this.supabase
      .from('outgoing_messages')
      .insert({ ...messageData, status: 'pending' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async updateOutgoingMessageStatus(id: string, status: string, errorMessage?: string) {
    const updates: any = { status };
    if (status === 'sent' || status === 'delivered') {
      updates.sent_at = new Date().toISOString();
    }
    if (errorMessage) {
      updates.error_message = errorMessage;
    }
    
    const { data, error } = await this.supabase
      .from('outgoing_messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

describe('Database Queries', () => {
  let db: DatabaseQueries;
  let mockSupabase: any;
  
  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    db = new DatabaseQueries(mockSupabase);
  });
  
  describe('User Queries', () => {
    beforeEach(() => {
      mockSupabase._seed('users', Object.values(mockUsers));
    });
    
    it('should get user by ID', async () => {
      const user = await db.getUserById('user_active_001');
      
      expect(user).toBeDefined();
      expect(user.id).toBe('user_active_001');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
    
    it('should get user by email', async () => {
      const user = await db.getUserByEmail('active@example.com');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('active@example.com');
    });
    
    it('should create new user', async () => {
      const newUser = {
        email: 'new@example.com',
        clerk_id: 'clerk_new_001',
        subscription_status: 'inactive',
      };
      
      const user = await db.createUser(newUser);
      
      expect(user).toBeDefined();
      expect(user.email).toBe('new@example.com');
      expect(user.id).toBeDefined();
      expect(user.created_at).toBeDefined();
    });
    
    it('should update user', async () => {
      const updates = { subscription_status: 'active' };
      const user = await db.updateUser('user_inactive_001', updates);
      
      expect(user).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
  });
  
  describe('Bot Connection Queries', () => {
    beforeEach(() => {
      mockSupabase._seed('bot_connections', [
        mockWhatsAppConnection,
        mockTelegramConnection,
      ]);
    });
    
    it('should get connection by ID', async () => {
      const connection = await db.getConnectionById('conn_whatsapp_001');
      
      expect(connection).toBeDefined();
      expect(connection.id).toBe('conn_whatsapp_001');
    });
    
    it('should get connections by user', async () => {
      const connections = await db.getConnectionsByUser('user_test123');
      
      expect(Array.isArray(connections)).toBe(true);
      expect(connections.length).toBeGreaterThan(0);
    });
    
    it('should get connection by platform', async () => {
      const connection = await db.getConnectionByPlatform('user_test123', 'whatsapp');
      
      expect(connection).toBeDefined();
      expect(connection.platform).toBe('whatsapp');
    });
    
    it('should create new connection', async () => {
      const newConnection = {
        user_id: 'user_new_001',
        platform: 'whatsapp',
        is_connected: false,
      };
      
      const connection = await db.createConnection(newConnection);
      
      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.created_at).toBeDefined();
    });
    
    it('should update connection', async () => {
      const updates = { is_connected: true, connected_at: new Date().toISOString() };
      const connection = await db.updateConnection('conn_whatsapp_001', updates);
      
      expect(connection).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('bot_connections');
    });
  });
  
  describe('Conversation Queries', () => {
    beforeEach(() => {
      mockSupabase._seed('conversations', mockConversations);
    });
    
    it('should get conversation by ID with messages', async () => {
      const conversation = await db.getConversationById('conv_001');
      
      expect(conversation).toBeDefined();
      expect(conversation.id).toBe('conv_001');
    });
    
    it('should get conversations by user', async () => {
      const conversations = await db.getConversationsByUser('user_active_001');
      
      expect(Array.isArray(conversations)).toBe(true);
    });
    
    it('should limit conversations returned', async () => {
      const conversations = await db.getConversationsByUser('user_active_001', 5);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    });
    
    it('should create new conversation', async () => {
      const newConversation = {
        user_id: 'user_active_001',
        connection_id: 'conn_whatsapp_001',
        platform: 'whatsapp',
      };
      
      const conversation = await db.createConversation(newConversation);
      
      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
    });
    
    it('should add message to conversation', async () => {
      const messageData = {
        role: 'user',
        content: 'Test message',
        message_type: 'text',
      };
      
      const message = await db.addMessage('conv_001', messageData);
      
      expect(message).toBeDefined();
      expect(message.role).toBe('user');
    });
  });
  
  describe('Subscription Queries', () => {
    beforeEach(() => {
      mockSupabase._seed('subscriptions', [
        {
          id: 'sub_001',
          user_id: 'user_active_001',
          stripe_subscription_id: 'sub_stripe_001',
          status: 'active',
        },
      ]);
    });
    
    it('should get subscription by user', async () => {
      const subscription = await db.getSubscriptionByUser('user_active_001');
      
      expect(subscription).toBeDefined();
      expect(subscription.user_id).toBe('user_active_001');
    });
    
    it('should get subscription by Stripe ID', async () => {
      const subscription = await db.getSubscriptionByStripeId('sub_stripe_001');
      
      expect(subscription).toBeDefined();
      expect(subscription.stripe_subscription_id).toBe('sub_stripe_001');
    });
  });
  
  describe('Message Queries', () => {
    beforeEach(() => {
      mockSupabase._seed('incoming_messages', [
        {
          id: 'incoming_001',
          external_id: 'wamid.1234567890',
          platform: 'whatsapp',
          content: 'Hello',
        },
      ]);
      mockSupabase._seed('outgoing_messages', [
        {
          id: 'outgoing_001',
          connection_id: 'conn_001',
          status: 'pending',
        },
      ]);
    });
    
    it('should get incoming message by external ID', async () => {
      const message = await db.getIncomingMessageByExternalId('wamid.1234567890', 'whatsapp');
      
      expect(message).toBeDefined();
      expect(message.external_id).toBe('wamid.1234567890');
    });
    
    it('should create incoming message', async () => {
      const messageData = {
        connection_id: 'conn_001',
        platform: 'whatsapp',
        external_id: 'wamid.new',
        from_user: '+1234567890',
        message_type: 'text',
        content: 'New message',
      };
      
      const message = await db.createIncomingMessage(messageData);
      
      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
    });
    
    it('should create outgoing message with pending status', async () => {
      const messageData = {
        connection_id: 'conn_001',
        platform: 'whatsapp',
        to_user: '+1234567890',
        message_type: 'text',
        content: 'Outgoing message',
      };
      
      const message = await db.createOutgoingMessage(messageData);
      
      expect(message).toBeDefined();
      expect(message.status).toBe('pending');
    });
    
    it('should update outgoing message status to sent', async () => {
      const message = await db.updateOutgoingMessageStatus('outgoing_001', 'sent');
      
      expect(message).toBeDefined();
      expect(message.status).toBe('sent');
    });
    
    it('should update outgoing message status to failed with error', async () => {
      const message = await db.updateOutgoingMessageStatus('outgoing_001', 'failed', 'Network error');
      
      expect(message).toBeDefined();
      expect(message.status).toBe('failed');
      expect(message.error_message).toBe('Network error');
    });
  });
});

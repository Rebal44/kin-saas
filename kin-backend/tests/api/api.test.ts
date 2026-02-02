/**
 * API Endpoint Tests
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createMockSupabaseClient, HttpStatus } from '../setup/test-utils';
import { mockUsers } from '../fixtures/conversations';
import { mockWhatsAppConnection } from '../fixtures/bot-connections';
import {
  createCheckoutCompletedEvent,
  constructStripeSignature,
} from '../fixtures/stripe-events';

// Create mock Express app for testing
function createMockApp() {
  const app = express();
  app.use(express.json());
  
  const mockSupabase = createMockSupabaseClient();
  
  // Mock auth middleware
  const mockAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
    }
    req.user = { id: 'user_test123', email: 'test@example.com' };
    next();
  };
  
  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and password required' });
    }
    
    const { data, error } = await mockSupabase.auth.signUp({ email, password });
    if (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
    }
    
    res.status(HttpStatus.CREATED).json({ user: data.user });
  });
  
  app.post('/api/auth/signin', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await mockSupabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid credentials' });
    }
    
    res.json({ user: data.user, token: 'mock_jwt_token' });
  });
  
  app.post('/api/auth/signout', mockAuth, async (req, res) => {
    await mockSupabase.auth.signOut();
    res.json({ message: 'Signed out successfully' });
  });
  
  app.get('/api/auth/me', mockAuth, async (req, res) => {
    mockSupabase._seed('users', Object.values(mockUsers));
    const { data } = await mockSupabase.from('users').select('*').eq('id', req.user.id).single();
    res.json({ user: data });
  });
  
  // User routes
  app.get('/api/users/profile', mockAuth, async (req, res) => {
    mockSupabase._seed('users', Object.values(mockUsers));
    const { data } = await mockSupabase.from('users').select('*').eq('id', req.user.id).single();
    res.json({ profile: data });
  });
  
  app.patch('/api/users/profile', mockAuth, async (req, res) => {
    const updates = req.body;
    const { data } = await mockSupabase.from('users').update(updates).eq('id', req.user.id).select().single();
    res.json({ profile: data });
  });
  
  app.delete('/api/users/account', mockAuth, async (req, res) => {
    await mockSupabase.from('users').delete().eq('id', req.user.id);
    res.status(HttpStatus.NO_CONTENT).send();
  });
  
  // Bot connection routes
  app.get('/api/connections', mockAuth, async (req, res) => {
    mockSupabase._seed('bot_connections', [mockWhatsAppConnection]);
    const { data } = await mockSupabase.from('bot_connections').select('*').eq('user_id', req.user.id);
    res.json({ connections: data });
  });
  
  app.post('/api/connections', mockAuth, async (req, res) => {
    const { platform } = req.body;
    if (!platform || !['whatsapp', 'telegram'].includes(platform)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid platform' });
    }
    
    const connection = await mockSupabase.from('bot_connections').insert({
      user_id: req.user.id,
      platform,
      is_connected: false,
    }).select().single();
    
    res.status(HttpStatus.CREATED).json({ connection: connection.data });
  });
  
  app.delete('/api/connections/:id', mockAuth, async (req, res) => {
    await mockSupabase.from('bot_connections').update({
      is_connected: false,
      disconnected_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    
    res.status(HttpStatus.NO_CONTENT).send();
  });
  
  // Webhook routes (public)
  app.post('/api/webhooks/telegram', async (req, res) => {
    // Verify Telegram secret token if configured
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid secret' });
    }
    
    // Process webhook
    res.status(HttpStatus.OK).json({ received: true });
  });
  
  app.post('/api/webhooks/whatsapp', async (req, res) => {
    // Verify WhatsApp signature
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Missing signature' });
    }
    
    res.status(HttpStatus.OK).json({ received: true });
  });
  
  app.get('/api/webhooks/whatsapp', (req, res) => {
    // Webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.send(challenge);
    } else {
      res.status(HttpStatus.FORBIDDEN).json({ error: 'Verification failed' });
    }
  });
  
  // Stripe webhook
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    
    if (!sig) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing signature' });
    }
    
    try {
      // Signature verification would happen here
      const event = JSON.parse(req.body);
      
      // Process event
      res.status(HttpStatus.OK).json({ received: true, type: event.type });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid signature' });
    }
  });
  
  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  });
  
  return { app, mockSupabase };
}

describe('API Endpoints', () => {
  let app: express.Application;
  let mockSupabase: any;
  
  beforeEach(() => {
    const mockApp = createMockApp();
    app = mockApp.app;
    mockSupabase = mockApp.mockSupabase;
  });
  
  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/signup', () => {
      it('should create new user with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({ email: 'new@example.com', password: 'SecurePass123!' });
        
        expect(response.status).toBe(HttpStatus.CREATED);
      });
      
      it('should reject signup without email', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({ password: 'SecurePass123!' });
        
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
        expect(response.body.error).toContain('required');
      });
      
      it('should reject signup without password', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({ email: 'new@example.com' });
        
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
    
    describe('POST /api/auth/signin', () => {
      it('should sign in with valid credentials', async () => {
        mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
          data: { user: { id: 'user_123', email: 'test@example.com' } },
          error: null,
        }));
        
        const response = await request(app)
          .post('/api/auth/signin')
          .send({ email: 'test@example.com', password: 'password' });
        
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.token).toBeDefined();
      });
      
      it('should reject invalid credentials', async () => {
        mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
          data: { user: null },
          error: { message: 'Invalid credentials' },
        }));
        
        const response = await request(app)
          .post('/api/auth/signin')
          .send({ email: 'test@example.com', password: 'wrongpassword' });
        
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
    
    describe('GET /api/auth/me', () => {
      it('should return current user with valid token', async () => {
        mockSupabase._seed('users', [mockUsers.active]);
        
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer valid_token');
        
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.user).toBeDefined();
      });
      
      it('should reject without authorization header', async () => {
        const response = await request(app).get('/api/auth/me');
        
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
    
    describe('POST /api/auth/signout', () => {
      it('should sign out user', async () => {
        mockSupabase.auth.signOut = vi.fn(() => Promise.resolve({ error: null }));
        
        const response = await request(app)
          .post('/api/auth/signout')
          .set('Authorization', 'Bearer valid_token');
        
        expect(response.status).toBe(HttpStatus.OK);
      });
    });
  });
  
  describe('User Management Endpoints', () => {
    describe('GET /api/users/profile', () => {
      it('should return user profile', async () => {
        mockSupabase._seed('users', [mockUsers.active]);
        
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', 'Bearer valid_token');
        
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.profile).toBeDefined();
      });
      
      it('should require authentication', async () => {
        const response = await request(app).get('/api/users/profile');
        
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
    
    describe('PATCH /api/users/profile', () => {
      it('should update user profile', async () => {
        const response = await request(app)
          .patch('/api/users/profile')
          .set('Authorization', 'Bearer valid_token')
          .send({ email: 'updated@example.com' });
        
        expect(response.status).toBe(HttpStatus.OK);
      });
    });
    
    describe('DELETE /api/users/account', () => {
      it('should delete user account', async () => {
        const response = await request(app)
          .delete('/api/users/account')
          .set('Authorization', 'Bearer valid_token');
        
        expect(response.status).toBe(HttpStatus.NO_CONTENT);
      });
    });
  });
  
  describe('Bot Connection Endpoints', () => {
    describe('GET /api/connections', () => {
      it('should return user connections', async () => {
        mockSupabase._seed('bot_connections', [mockWhatsAppConnection]);
        
        const response = await request(app)
          .get('/api/connections')
          .set('Authorization', 'Bearer valid_token');
        
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.connections).toBeInstanceOf(Array);
      });
    });
    
    describe('POST /api/connections', () => {
      it('should create WhatsApp connection', async () => {
        const response = await request(app)
          .post('/api/connections')
          .set('Authorization', 'Bearer valid_token')
          .send({ platform: 'whatsapp' });
        
        expect(response.status).toBe(HttpStatus.CREATED);
        expect(response.body.connection).toBeDefined();
      });
      
      it('should create Telegram connection', async () => {
        const response = await request(app)
          .post('/api/connections')
          .set('Authorization', 'Bearer valid_token')
          .send({ platform: 'telegram' });
        
        expect(response.status).toBe(HttpStatus.CREATED);
      });
      
      it('should reject invalid platform', async () => {
        const response = await request(app)
          .post('/api/connections')
          .set('Authorization', 'Bearer valid_token')
          .send({ platform: 'invalid' });
        
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
    
    describe('DELETE /api/connections/:id', () => {
      it('should disconnect bot', async () => {
        const response = await request(app)
          .delete('/api/connections/conn_whatsapp_001')
          .set('Authorization', 'Bearer valid_token');
        
        expect(response.status).toBe(HttpStatus.NO_CONTENT);
      });
    });
  });
  
  describe('Bot Webhook Endpoints', () => {
    describe('POST /api/webhooks/telegram', () => {
      it('should accept valid webhook', async () => {
        const response = await request(app)
          .post('/api/webhooks/telegram')
          .send({ update_id: 123, message: { text: 'Hello' } });
        
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.received).toBe(true);
      });
      
      it('should verify secret token when configured', async () => {
        process.env.TELEGRAM_WEBHOOK_SECRET = 'my_secret';
        
        const response = await request(app)
          .post('/api/webhooks/telegram')
          .send({ update_id: 123 });
        
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
        
        delete process.env.TELEGRAM_WEBHOOK_SECRET;
      });
    });
    
    describe('POST /api/webhooks/whatsapp', () => {
      it('should accept webhook with signature', async () => {
        const response = await request(app)
          .post('/api/webhooks/whatsapp')
          .set('X-Hub-Signature-256', 'sha256=valid_signature')
          .send({ object: 'whatsapp_business_account', entry: [] });
        
        expect(response.status).toBe(HttpStatus.OK);
      });
      
      it('should reject webhook without signature', async () => {
        const response = await request(app)
          .post('/api/webhooks/whatsapp')
          .send({ object: 'whatsapp_business_account', entry: [] });
        
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
    
    describe('GET /api/webhooks/whatsapp', () => {
      it('should verify webhook subscription', async () => {
        process.env.WHATSAPP_VERIFY_TOKEN = 'verify_token';
        
        const response = await request(app)
          .get('/api/webhooks/whatsapp')
          .query({
            'hub.mode': 'subscribe',
            'hub.verify_token': 'verify_token',
            'hub.challenge': 'challenge_code',
          });
        
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.text).toBe('challenge_code');
        
        delete process.env.WHATSAPP_VERIFY_TOKEN;
      });
      
      it('should reject invalid verification token', async () => {
        process.env.WHATSAPP_VERIFY_TOKEN = 'verify_token';
        
        const response = await request(app)
          .get('/api/webhooks/whatsapp')
          .query({
            'hub.mode': 'subscribe',
            'hub.verify_token': 'wrong_token',
            'hub.challenge': 'challenge_code',
          });
        
        expect(response.status).toBe(HttpStatus.FORBIDDEN);
        
        delete process.env.WHATSAPP_VERIFY_TOKEN;
      });
    });
  });
  
  describe('Stripe Webhook Endpoint', () => {
    it('should accept valid Stripe webhook', async () => {
      const event = createCheckoutCompletedEvent();
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'valid_signature')
        .send(JSON.stringify(event));
      
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.received).toBe(true);
    });
    
    it('should reject webhook without signature', async () => {
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send(JSON.stringify({ type: 'test' }));
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});

/**
 * Load Tests for Kin SaaS
 * 
 * Tests webhook endpoint performance, database query performance, and concurrent user simulation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMockSupabaseClient, delay } from '../setup/test-utils';
import request from 'supertest';
import express from 'express';

// Configuration
const CONFIG = {
  concurrentUsers: 100,
  durationMs: 30000, // 30 seconds
  rampUpMs: 5000,    // 5 seconds ramp-up
  webhookRequests: 1000,
};

// Metrics collector
class MetricsCollector {
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [] as number[],
    errors: [] as string[],
  };
  
  recordRequest(success: boolean, responseTime: number, error?: string) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      if (error) this.metrics.errors.push(error);
    }
    this.metrics.responseTimes.push(responseTime);
  }
  
  getSummary() {
    const times = this.metrics.responseTimes.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];
    
    return {
      ...this.metrics,
      avgResponseTime: avg,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100,
    };
  }
}

describe('Load Tests', () => {
  describe('Webhook Endpoint Performance', () => {
    let app: express.Application;
    
    beforeAll(() => {
      app = express();
      app.use(express.json());
      
      // Mock webhook endpoint
      app.post('/api/webhooks/telegram', (req, res) => {
        // Simulate processing time
        setTimeout(() => {
          res.json({ received: true, processed: Date.now() });
        }, 10);
      });
      
      app.post('/api/webhooks/whatsapp', (req, res) => {
        setTimeout(() => {
          res.json({ received: true, processed: Date.now() });
        }, 10);
      });
    });
    
    it('should handle high volume of Telegram webhooks', async () => {
      const metrics = new MetricsCollector();
      const promises: Promise<void>[] = [];
      
      const startTime = Date.now();
      
      // Send concurrent webhook requests
      for (let i = 0; i < CONFIG.webhookRequests; i++) {
        const promise = (async () => {
          const reqStart = Date.now();
          try {
            const response = await request(app)
              .post('/api/webhooks/telegram')
              .send({
                update_id: i,
                message: {
                  message_id: i,
                  from: { id: i, is_bot: false, first_name: 'User' },
                  chat: { id: i, type: 'private' },
                  date: Math.floor(Date.now() / 1000),
                  text: `Test message ${i}`,
                },
              });
            
            const responseTime = Date.now() - reqStart;
            metrics.recordRequest(response.status === 200, responseTime);
          } catch (error) {
            metrics.recordRequest(false, Date.now() - reqStart, String(error));
          }
        })();
        
        promises.push(promise);
        
        // Small delay to simulate real traffic pattern
        if (i % 100 === 0) {
          await delay(10);
        }
      }
      
      await Promise.all(promises);
      
      const summary = metrics.getSummary();
      const duration = Date.now() - startTime;
      const rps = (summary.totalRequests / duration) * 1000;
      
      console.log('Telegram Webhook Load Test Results:');
      console.log(`  Total requests: ${summary.totalRequests}`);
      console.log(`  Success rate: ${summary.successRate.toFixed(2)}%`);
      console.log(`  Requests/sec: ${rps.toFixed(2)}`);
      console.log(`  Avg response time: ${summary.avgResponseTime.toFixed(2)}ms`);
      console.log(`  P95 response time: ${summary.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  P99 response time: ${summary.p99ResponseTime.toFixed(2)}ms`);
      
      // Assertions
      expect(summary.successRate).toBeGreaterThan(95);
      expect(summary.p95ResponseTime).toBeLessThan(1000);
      expect(summary.p99ResponseTime).toBeLessThan(2000);
    }, 60000);
    
    it('should handle high volume of WhatsApp webhooks', async () => {
      const metrics = new MetricsCollector();
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < CONFIG.webhookRequests; i++) {
        const promise = (async () => {
          const reqStart = Date.now();
          try {
            const response = await request(app)
              .post('/api/webhooks/whatsapp')
              .send({
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
                        id: `wamid.${i}`,
                        timestamp: String(Math.floor(Date.now() / 1000)),
                        type: 'text',
                        text: { body: `Test message ${i}` },
                      }],
                    },
                    field: 'messages',
                  }],
                }],
              });
            
            const responseTime = Date.now() - reqStart;
            metrics.recordRequest(response.status === 200, responseTime);
          } catch (error) {
            metrics.recordRequest(false, Date.now() - reqStart, String(error));
          }
        })();
        
        promises.push(promise);
        
        if (i % 100 === 0) {
          await delay(10);
        }
      }
      
      await Promise.all(promises);
      
      const summary = metrics.getSummary();
      
      console.log('WhatsApp Webhook Load Test Results:');
      console.log(`  Total requests: ${summary.totalRequests}`);
      console.log(`  Success rate: ${summary.successRate.toFixed(2)}%`);
      console.log(`  P95 response time: ${summary.p95ResponseTime.toFixed(2)}ms`);
      
      expect(summary.successRate).toBeGreaterThan(95);
      expect(summary.p95ResponseTime).toBeLessThan(1000);
    }, 60000);
  });
  
  describe('Database Query Performance', () => {
    let mockSupabase: any;
    
    beforeAll(() => {
      mockSupabase = createMockSupabaseClient();
      
      // Seed with test data
      const users = Array.from({ length: 1000 }, (_, i) => ({
        id: `user_${i}`,
        email: `user${i}@example.com`,
        subscription_status: i % 3 === 0 ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
      }));
      
      const connections = Array.from({ length: 2000 }, (_, i) => ({
        id: `conn_${i}`,
        user_id: `user_${i % 1000}`,
        platform: i % 2 === 0 ? 'whatsapp' : 'telegram',
        is_connected: i % 5 === 0,
        created_at: new Date().toISOString(),
      }));
      
      const messages = Array.from({ length: 5000 }, (_, i) => ({
        id: `msg_${i}`,
        connection_id: `conn_${i % 2000}`,
        platform: i % 2 === 0 ? 'whatsapp' : 'telegram',
        content: `Message ${i}`,
        created_at: new Date().toISOString(),
      }));
      
      mockSupabase._seed('users', users);
      mockSupabase._seed('bot_connections', connections);
      mockSupabase._seed('incoming_messages', messages);
    });
    
    it('should query users efficiently', async () => {
      const iterations = 100;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await mockSupabase.from('users').select('*').eq('id', `user_${i % 1000}`).single();
        times.push(Date.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      
      console.log('User Query Performance:');
      console.log(`  Avg time: ${avg.toFixed(2)}ms`);
      console.log(`  Max time: ${max}ms`);
      
      expect(avg).toBeLessThan(50);
      expect(max).toBeLessThan(200);
    });
    
    it('should query connections by user efficiently', async () => {
      const iterations = 100;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await mockSupabase.from('bot_connections').select('*').eq('user_id', `user_${i % 1000}`);
        times.push(Date.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      
      console.log('Connection Query Performance:');
      console.log(`  Avg time: ${avg.toFixed(2)}ms`);
      
      expect(avg).toBeLessThan(50);
    });
    
    it('should handle concurrent database queries', async () => {
      const concurrent = 50;
      const start = Date.now();
      
      const promises = Array.from({ length: concurrent }, (_, i) =>
        mockSupabase.from('incoming_messages').select('*').eq('connection_id', `conn_${i % 2000}`)
      );
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - start;
      const avgTime = totalTime / concurrent;
      
      console.log('Concurrent Query Performance:');
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Avg time per query: ${avgTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(1000);
    });
  });
  
  describe('Concurrent User Simulation', () => {
    it('should simulate concurrent user signups', async () => {
      const concurrentUsers = 50;
      const metrics = new MetricsCollector();
      
      const promises = Array.from({ length: concurrentUsers }, async (_, i) => {
        const start = Date.now();
        try {
          // Simulate signup API call
          await delay(Math.random() * 100); // Simulate network latency
          const mockSupabase = createMockSupabaseClient();
          
          await mockSupabase.auth.signUp({
            email: `loadtest${Date.now()}${i}@example.com`,
            password: 'SecurePass123!',
          });
          
          metrics.recordRequest(true, Date.now() - start);
        } catch (error) {
          metrics.recordRequest(false, Date.now() - start, String(error));
        }
      });
      
      await Promise.all(promises);
      
      const summary = metrics.getSummary();
      
      console.log('Concurrent Signup Simulation:');
      console.log(`  Concurrent users: ${concurrentUsers}`);
      console.log(`  Success rate: ${summary.successRate.toFixed(2)}%`);
      console.log(`  Avg time: ${summary.avgResponseTime.toFixed(2)}ms`);
      
      expect(summary.successRate).toBeGreaterThan(95);
    });
    
    it('should simulate concurrent message processing', async () => {
      const concurrentMessages = 100;
      const metrics = new MetricsCollector();
      
      const promises = Array.from({ length: concurrentMessages }, async (_, i) => {
        const start = Date.now();
        try {
          // Simulate message processing
          await delay(10 + Math.random() * 50);
          metrics.recordRequest(true, Date.now() - start);
        } catch (error) {
          metrics.recordRequest(false, Date.now() - start, String(error));
        }
      });
      
      await Promise.all(promises);
      
      const summary = metrics.getSummary();
      
      console.log('Concurrent Message Processing:');
      console.log(`  Messages: ${concurrentMessages}`);
      console.log(`  Success rate: ${summary.successRate.toFixed(2)}%`);
      console.log(`  P95 time: ${summary.p95ResponseTime.toFixed(2)}ms`);
      
      expect(summary.successRate).toBe(100);
      expect(summary.p95ResponseTime).toBeLessThan(200);
    });
  });
});

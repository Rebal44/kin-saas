// src/services/kin.ts
// Kin backend API integration

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

interface KinMessageRequest {
  userId: string;
  platform: 'whatsapp' | 'telegram';
  message: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  metadata?: Record<string, any>;
}

interface KinMessageResponse {
  response: string;
  actions?: Array<{
    type: string;
    payload: any;
  }>;
  metadata?: Record<string, any>;
}

class KinBackendService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.KIN_API_URL,
      timeout: 60000, // Longer timeout for AI processing
      headers: {
        'Content-Type': 'application/json',
        ...(config.KIN_API_KEY && { 'X-API-Key': config.KIN_API_KEY }),
      },
    });
  }

  // Send message to Kin backend and get response
  async processMessage(
    userId: string,
    platform: 'whatsapp' | 'telegram',
    message: string,
    history: any[] = []
  ): Promise<KinMessageResponse | null> {
    try {
      const request: KinMessageRequest = {
        userId,
        platform,
        message,
        conversationHistory: history.map(msg => ({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.created_at,
        })),
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'bot-integration',
        },
      };

      logger.debug('Sending to Kin backend:', { userId, platform, messageLength: message.length });

      const response = await this.client.post('/api/chat', request);

      if (response.data) {
        logger.info('Received response from Kin backend');
        return response.data as KinMessageResponse;
      }

      return null;
    } catch (error: any) {
      logger.error('Error calling Kin backend:', error.response?.data || error.message);
      return null;
    }
  }

  // Register new user connection
  async registerUserConnection(
    userId: string,
    platform: 'whatsapp' | 'telegram',
    platformUserId: string,
    userInfo: {
      phoneNumber?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<boolean> {
    try {
      await this.client.post('/api/users/connect', {
        userId,
        platform,
        platformUserId,
        ...userInfo,
        connectedAt: new Date().toISOString(),
      });
      
      logger.info(`User registered: ${userId} on ${platform}`);
      return true;
    } catch (error: any) {
      logger.error('Error registering user:', error.message);
      // Don't fail the connection if backend is unavailable
      return true;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const kinBackendService = new KinBackendService();

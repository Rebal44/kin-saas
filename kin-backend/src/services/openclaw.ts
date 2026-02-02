import axios from 'axios';
import { logger, retryWithBackoff } from '../utils';
import { OpenClawRequest, OpenClawResponse, Platform } from '../types';

// This service handles communication with OpenClaw
// Currently mocked for development, will be replaced with actual API calls

export class OpenClawRelayService {
  private apiUrl: string;
  private apiKey: string;
  private isMockMode: boolean;

  constructor() {
    this.apiUrl = process.env.OPENCLAW_API_URL || 'http://localhost:18789';
    this.apiKey = process.env.OPENCLAW_API_KEY || '';
    this.isMockMode = !this.apiKey;

    if (this.isMockMode) {
      logger.info('OpenClaw relay running in MOCK mode');
    }
  }

  async sendMessage(request: OpenClawRequest): Promise<OpenClawResponse> {
    // Mock mode - simulate processing delay and return mock response
    if (this.isMockMode) {
      logger.info(`[MOCK] OpenClaw processing message from ${request.platform}: ${request.message}`);
      
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return mock response based on message content
      return this.generateMockResponse(request.message);
    }

    // Real OpenClaw API call
    try {
      const response = await retryWithBackoff(async () => {
        const result = await axios.post(
          `${this.apiUrl}/v1/chat`,
          {
            message: request.message,
            user_id: request.user_id,
            conversation_id: request.conversation_id,
            platform: request.platform,
            metadata: request.metadata,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return result.data;
      });

      return {
        message: response.message || 'No response',
        metadata: response.metadata,
      };
    } catch (error) {
      logger.error('Error calling OpenClaw API:', error);
      return {
        message: 'Sorry, I encountered an error processing your message. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Generate mock responses for development
  private generateMockResponse(message: string): OpenClawResponse {
    const lowerMessage = message.toLowerCase();

    // Simple keyword-based responses for testing
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return {
        message: 'Hello! I\'m Kin, your AI assistant. How can I help you today? 👋',
      };
    }

    if (lowerMessage.includes('help')) {
      return {
        message: 'I can help you with:\n\n• Answering questions\n• Summarizing information\n• Setting reminders\n• And much more!\n\nWhat would you like to do?',
      };
    }

    if (lowerMessage.includes('weather')) {
      return {
        message: 'I\'d be happy to help with weather information! However, I\'ll need access to your location. Please share your location with me.',
      };
    }

    if (lowerMessage.includes('time')) {
      const now = new Date();
      return {
        message: `The current time is ${now.toLocaleTimeString()}.`,
      };
    }

    if (lowerMessage.includes('thank')) {
      return {
        message: 'You\'re welcome! 😊 Let me know if you need anything else.',
      };
    }

    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return {
        message: 'Goodbye! Have a great day! 👋',
      };
    }

    // Default response
    return {
      message: `I received your message: "${message}"\n\nThis is a mock response. In production, I would connect to OpenClaw for intelligent responses.`,
    };
  }

  // Health check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    if (this.isMockMode) {
      return { status: 'ok', message: 'Mock mode active' };
    }

    try {
      const response = await axios.get(`${this.apiUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 5000,
      });

      if (response.status === 200) {
        return { status: 'ok' };
      }
      return { status: 'error', message: 'Unexpected response' };
    } catch (error) {
      logger.error('OpenClaw health check failed:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const openClawRelayService = new OpenClawRelayService();
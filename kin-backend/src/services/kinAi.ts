import { logger, retryWithBackoff } from '../utils';
import { KinAiRequest, KinAiResponse } from '../types';

// Kimi (Moonshot) Responses API (no mock mode).
const DEFAULT_KIMI_API_URL = 'https://api.moonshot.ai/v1';

export class KinAiRelayService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.KIN_AI_API_KEY || '';
    this.model = process.env.KIN_AI_MODEL || 'kimi-k2.5';
    this.baseUrl = process.env.KIN_AI_API_URL || DEFAULT_KIMI_API_URL;
  }

  async sendMessage(request: KinAiRequest): Promise<KinAiResponse> {
    if (!this.apiKey) {
      return {
        message: 'Kin is not configured yet. Please contact support.',
        error: 'KIN_AI_API_KEY is not set',
      };
    }

    const history = request.history || (request.metadata?.history as any[]) || [];

    const input = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: request.message },
    ];

    try {
      const response = await retryWithBackoff(async () => {
        const result = await fetch(`${this.baseUrl}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            input,
            instructions:
              'You are Kin, the "ChatGPT for Agents." Be concise, clear, and helpful. If a user asks for actions you cannot perform, explain what you can do instead.',
            temperature: 0.6,
            max_output_tokens: 800,
            store: false,
          }),
        });

        const data = await result.json();
        if (!result.ok) {
          throw new Error(data?.error?.message || 'Kimi API error');
        }
        return data;
      });

      const text = extractOutputText(response);
      return {
        message: text || 'No response from AI.',
        metadata: response,
      };
    } catch (error) {
      logger.error('Error calling Kimi:', error);
      return {
        message: 'Sorry, I had trouble processing that. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

function extractOutputText(response: any): string {
  if (typeof response?.output_text === 'string') {
    return response.output_text;
  }

  const output = response?.output || [];
  for (const item of output) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      const textPart = item.content.find((c: any) => c.type === 'output_text');
      if (textPart?.text) return textPart.text;
    }
  }

  return '';
}

export const kinAiRelayService = new KinAiRelayService();

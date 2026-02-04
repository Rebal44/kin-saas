import { executeToolByName, getOpenAIToolsSpec } from './tools';

const DEFAULT_KIMI_API_URL = 'https://api.moonshot.ai/v1';
const FALLBACK_KIMI_API_URL = 'https://api.moonshot.cn/v1';
const KIMI_CODE_API_URL = 'https://api.kimi.com/coding/v1';
const KIMI_CODE_FALLBACK_MODEL = 'kimi-for-coding';

function normalizeApiKey(raw: string): string {
  let key = (raw || '').trim();

  // Some UIs/docs include "Bearer ..." or wrap in quotes; normalize for reliability.
  if (/^bearer\s+/i.test(key)) key = key.replace(/^bearer\s+/i, '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Remove accidental newlines.
  key = key.replace(/[\r\n]/g, '').trim();
  return key;
}

function getTemperature(model: string, baseUrl: string): number {
  const configured = process.env.KIN_AI_TEMPERATURE;
  if (configured !== undefined && configured !== '') {
    const value = Number(configured);
    if (Number.isFinite(value)) return value;
  }

  // Moonshot's kimi-k2.5 currently rejects temperatures other than 1.
  if (baseUrl.includes('moonshot') && model === 'kimi-k2.5') return 1;

  return 0.6;
}

export async function kimiRespond(params: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  const apiKey = normalizeApiKey(
    process.env.KIN_AI_API_KEY ||
      process.env.MOONSHOT_API_KEY ||
      process.env.KIMI_API_KEY ||
    ''
  );
  const model = process.env.KIN_AI_MODEL || 'kimi-k2.5';
  const configuredBaseUrl = process.env.KIN_AI_API_URL || DEFAULT_KIMI_API_URL;
  const baseUrls = Array.from(
    new Set([configuredBaseUrl, DEFAULT_KIMI_API_URL, FALLBACK_KIMI_API_URL, KIMI_CODE_API_URL])
  );

  if (!apiKey) {
    return 'Kin is not configured yet. Please contact support.';
  }

  const messages = [
    {
      role: 'system' as const,
      content:
        [
          'You are Kin — the user’s personal AI agent inside Telegram.',
          '',
          'Rules:',
          '- Never mention or reveal your underlying model/provider, training data, or comparisons to other AIs.',
          "- If asked what model you are, say: “I’m Kin — your personal AI agent.” Then keep it brief.",
          '- Be direct and practical. Keep responses short unless the user asks for depth.',
          '- Do not use long meta explanations about AI capabilities.',
          '- If the user asks for real-time info you don’t have, ask them for the needed details or suggest a simple next step.',
          '- Use available tools when they help (e.g., current weather or current time).',
        ].join('\n'),
    },
    ...(params.history || []),
    { role: 'user' as const, content: params.message },
  ];

  // OpenAI-compatible Chat Completions + tool calling loop.
  let lastError: { status: number; message: string; baseUrl: string } | null = null;
  for (const baseUrl of baseUrls) {
    const tools = getOpenAIToolsSpec();
    const temperature = getTemperature(model, baseUrl);

    const attempt = await runToolCallingLoop({
      baseUrl,
      apiKey,
      model,
      messages,
      tools,
      temperature,
    });
    if (attempt.ok) return attempt.text;

    lastError = { status: attempt.status, message: attempt.message, baseUrl };
    if (attempt.status === 401) continue;

    // Kimi Code uses different model ids; retry with a safe default if it looks like a model issue.
    if (attempt.status === 404 || /model/i.test(attempt.message)) {
      const fallbackAttempt = await runToolCallingLoop({
        baseUrl,
        apiKey,
        model: KIMI_CODE_FALLBACK_MODEL,
        messages,
        tools,
        temperature: getTemperature(KIMI_CODE_FALLBACK_MODEL, baseUrl),
      });
      if (fallbackAttempt.ok) return fallbackAttempt.text;
      lastError = { status: fallbackAttempt.status, message: fallbackAttempt.message, baseUrl };
      if (fallbackAttempt.status === 401) continue;
    }

    return `Sorry, I had trouble processing that (${lastError.message}, HTTP ${lastError.status}).`;
  }

  if (lastError) {
    return `Sorry, I had trouble processing that (${lastError.message}, HTTP ${lastError.status}).`;
  }

  return 'No response from AI.';
}

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};

async function runToolCallingLoop(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  tools: any[];
  temperature: number;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const { baseUrl, apiKey, model, tools, temperature } = params;
  const workingMessages: OpenAIMessage[] = params.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < 4; i++) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        messages: workingMessages,
        tools,
        tool_choice: 'auto',
        temperature,
        max_tokens: 800,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || 'Kimi API error';
      return { ok: false, status: res.status, message: msg };
    }

    const message = (data?.choices?.[0]?.message || {}) as OpenAIMessage;
    const toolCalls = (message as any)?.tool_calls as OpenAIMessage['tool_calls'];

    if (Array.isArray(toolCalls) && toolCalls.length) {
      // Append assistant message that requested tools.
      workingMessages.push({
        role: 'assistant',
        content: message.content || '',
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        const name = call?.function?.name;
        const rawArgs = call?.function?.arguments || '{}';
        let args: any = {};
        try {
          args = JSON.parse(rawArgs);
        } catch {
          args = {};
        }

        const toolResult = await executeToolByName(String(name || ''), args);
        workingMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: toolResult.content,
        });
      }

      continue;
    }

    const text = message?.content;
    if (typeof text === 'string' && text.trim()) return { ok: true, text };
    return { ok: false, status: 502, message: 'No response text from AI' };
  }

  return { ok: false, status: 504, message: 'Tool loop exceeded' };
}

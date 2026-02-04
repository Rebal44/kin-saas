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
        'You are Kin, the "ChatGPT for Agents." Be concise, clear, and helpful. If a user asks for actions you cannot perform, explain what you can do instead.',
    },
    ...(params.history || []),
    { role: 'user' as const, content: params.message },
  ];

  // Moonshot/Kimi is OpenAI-compatible, but it typically supports the Chat Completions API.
  let lastError: { status: number; message: string; baseUrl: string } | null = null;
  for (const baseUrl of baseUrls) {
    // First attempt: configured model
    const first = await callOpenAIChatCompletions({
      baseUrl,
      apiKey,
      model,
      messages,
      temperature: getTemperature(model, baseUrl),
    });
    if (first.ok) {
      return first.text;
    }

    const firstError = getErrorInfo(first);
    lastError = { status: firstError.status, message: firstError.message, baseUrl };
    if (firstError.status === 401) continue;

    // Kimi Code uses different model ids; if we got a model error, retry with a safe default.
    if (firstError.status === 404 || /model/i.test(firstError.message)) {
      const fallback = await callOpenAIChatCompletions({
        baseUrl,
        apiKey,
        model: KIMI_CODE_FALLBACK_MODEL,
        messages,
        temperature: getTemperature(KIMI_CODE_FALLBACK_MODEL, baseUrl),
      });
      if (fallback.ok) {
        return fallback.text;
      }
      const fallbackError = getErrorInfo(fallback);
      lastError = { status: fallbackError.status, message: fallbackError.message, baseUrl };
      if (fallbackError.status === 401) continue;
    }

    return `Sorry, I had trouble processing that (${lastError.message}, HTTP ${lastError.status}).`;
  }

  if (lastError) {
    return `Sorry, I had trouble processing that (${lastError.message}, HTTP ${lastError.status}).`;
  }

  return 'No response from AI.';
}

async function callOpenAIChatCompletions(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature: number;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const { baseUrl, apiKey, model, messages, temperature } = params;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 800,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || 'Kimi API error';
    return { ok: false, status: res.status, message: msg };
  }

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text === 'string' && text.trim()) return { ok: true, text };

  return { ok: false, status: 502, message: 'No response text from AI' };
}

function getErrorInfo(
  result: { ok: true; text: string } | { ok: false; status: number; message: string }
): { status: number; message: string } {
  if (!('status' in result)) {
    return { status: 500, message: 'Unknown error' };
  }
  return { status: result.status, message: result.message };
}

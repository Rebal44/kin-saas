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
    const first = await callOpenAIChatCompletions({ baseUrl, apiKey, model, messages });
    if (first.ok) return first.text;

    lastError = { status: first.status, message: first.message, baseUrl };
    if (first.status === 401) continue;

    // Kimi Code uses different model ids; if we got a model error, retry with a safe default.
    if (first.status === 404 || /model/i.test(first.message)) {
      const fallback = await callOpenAIChatCompletions({
        baseUrl,
        apiKey,
        model: KIMI_CODE_FALLBACK_MODEL,
        messages,
      });
      if (fallback.ok) return fallback.text;
      lastError = { status: fallback.status, message: fallback.message, baseUrl };
      if (fallback.status === 401) continue;
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
}): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const { baseUrl, apiKey, model, messages } = params;

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
      temperature: 0.6,
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

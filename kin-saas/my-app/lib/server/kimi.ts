const DEFAULT_KIMI_API_URL = 'https://api.moonshot.ai/v1';
const FALLBACK_KIMI_API_URL = 'https://api.moonshot.cn/v1';

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
    new Set([configuredBaseUrl, configuredBaseUrl === DEFAULT_KIMI_API_URL ? FALLBACK_KIMI_API_URL : DEFAULT_KIMI_API_URL])
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
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Moonshot/Kimi is OpenAI-compatible; different gateways sometimes expect different headers.
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
      const msg = data?.error?.message || 'Kimi API error';
      lastError = { status: res.status, message: msg, baseUrl };
      // If this base URL failed for auth, try the fallback before giving up.
      if (res.status === 401) continue;
      return `Sorry, I had trouble processing that (${msg}, HTTP ${res.status}).`;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (typeof text === 'string' && text.trim()) return text;
  }

  if (lastError) {
    return `Sorry, I had trouble processing that (${lastError.message}, HTTP ${lastError.status}).`;
  }

  return 'No response from AI.';
}

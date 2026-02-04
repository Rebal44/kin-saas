const DEFAULT_KIMI_API_URL = 'https://api.moonshot.ai/v1';

export async function kimiRespond(params: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  const apiKey = (
    process.env.KIN_AI_API_KEY ||
    process.env.MOONSHOT_API_KEY ||
    process.env.KIMI_API_KEY ||
    ''
  ).trim();
  const model = process.env.KIN_AI_MODEL || 'kimi-k2.5';
  const baseUrl = process.env.KIN_AI_API_URL || DEFAULT_KIMI_API_URL;

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

  const data = (await res.json()) as any;
  if (!res.ok) {
    const msg = data?.error?.message || 'Kimi API error';
    return `Sorry, I had trouble processing that (${msg}, HTTP ${res.status}).`;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text === 'string' && text.trim()) return text;

  return 'No response from AI.';
}

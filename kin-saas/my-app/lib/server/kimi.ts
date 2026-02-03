const DEFAULT_KIMI_API_URL = 'https://api.moonshot.ai/v1';

export async function kimiRespond(params: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  const apiKey = process.env.KIN_AI_API_KEY || '';
  const model = process.env.KIN_AI_MODEL || 'kimi-k2.5';
  const baseUrl = process.env.KIN_AI_API_URL || DEFAULT_KIMI_API_URL;

  if (!apiKey) {
    return 'Kin is not configured yet. Please contact support.';
  }

  const input = [
    ...(params.history || []),
    { role: 'user' as const, content: params.message },
  ];

  const res = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
      instructions:
        'You are Kin, the "ChatGPT for Agents." Be concise, clear, and helpful. If a user asks for actions you cannot perform, explain what you can do instead.',
      temperature: 0.6,
      max_output_tokens: 800,
      store: false,
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    const msg = data?.error?.message || 'Kimi API error';
    return `Sorry, I had trouble processing that (${msg}).`;
  }

  if (typeof data?.output_text === 'string') return data.output_text;

  const output = data?.output || [];
  for (const item of output) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      const textPart = item.content.find((c: any) => c.type === 'output_text');
      if (textPart?.text) return textPart.text;
    }
  }

  return 'No response from AI.';
}


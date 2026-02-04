const DEFAULT_OPENCLAW_AGENT = 'main';

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function getGatewayUrl(): string {
  return (process.env.OPENCLAW_GATEWAY_URL || '').trim();
}

function getGatewayToken(): string {
  return (process.env.OPENCLAW_GATEWAY_TOKEN || '').trim();
}

function getAgentId(): string {
  return (process.env.OPENCLAW_AGENT_ID || DEFAULT_OPENCLAW_AGENT).trim();
}

export function isOpenClawEnabled(): boolean {
  return !!getGatewayUrl() && !!getGatewayToken();
}

export async function openclawRespond(params: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  sessionKey?: string;
}): Promise<string> {
  const gatewayUrl = getGatewayUrl();
  const token = getGatewayToken();

  if (!gatewayUrl || !token) {
    return 'OpenClaw is not configured yet.';
  }

  const agentId = getAgentId();
  const baseUrl = normalizeUrl(gatewayUrl);
  const model = `openclaw:${agentId}`;

  const messages = [
    ...(params.history || []),
    { role: 'user' as const, content: params.message },
  ];

  // Stable routing: prefer userId so reconnects keep the same agent session.
  const sessionKey = params.userId || params.sessionKey || undefined;

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'x-openclaw-agent-id': agentId,
      ...(sessionKey ? { 'x-openclaw-session-key': sessionKey, 'openclaw-session-key': sessionKey } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      user: sessionKey,
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || 'OpenClaw gateway error';
    return `Sorry, I had trouble processing that (${msg}).`;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text === 'string' && text.trim()) return text;

  return 'No response from AI.';
}

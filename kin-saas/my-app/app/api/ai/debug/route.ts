import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeUrlHost(value: string): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).host;
  } catch {
    return null;
  }
}

function normalizeApiKey(raw: string): string {
  let key = (raw || '').trim();
  if (/^bearer\s+/i.test(key)) key = key.replace(/^bearer\s+/i, '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/[\r\n]/g, '').trim();
  return key;
}

function pickApiKeyEnv(): { source: string; value: string } {
  const candidates: Array<[string, string | undefined]> = [
    ['KIN_AI_API_KEY', process.env.KIN_AI_API_KEY],
    ['MOONSHOT_API_KEY', process.env.MOONSHOT_API_KEY],
    ['KIMI_API_KEY', process.env.KIMI_API_KEY],
  ];

  for (const [name, value] of candidates) {
    if (value && value.trim()) return { source: name, value };
  }

  return { source: 'none', value: '' };
}

export async function GET() {
  const chosen = pickApiKeyEnv();
  const key = normalizeApiKey(chosen.value);

  const fingerprint = key
    ? crypto.createHash('sha256').update(key).digest('hex').slice(0, 12)
    : null;

  const openclawGatewayUrl = (process.env.OPENCLAW_GATEWAY_URL || '').trim();
  const openclawToken = (process.env.OPENCLAW_GATEWAY_TOKEN || '').trim();
  const openclawAgentId = (process.env.OPENCLAW_AGENT_ID || 'main').trim();

  return Response.json(
    {
      ok: true,
      keySource: chosen.source,
      keyLength: key ? key.length : 0,
      keyPrefix: key ? key.slice(0, 3) : null,
      keySuffix: key ? key.slice(-4) : null,
      keyFingerprint: fingerprint,
      baseUrl: process.env.KIN_AI_API_URL || 'https://api.moonshot.ai/v1',
      model: process.env.KIN_AI_MODEL || 'kimi-k2.5',
      openclawEnabled: Boolean(openclawGatewayUrl && openclawToken),
      openclawGatewayHost: safeUrlHost(openclawGatewayUrl),
      openclawAgentId,
    },
    { status: 200 }
  );
}

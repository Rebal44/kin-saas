const DEFAULT_AGENT_ID = 'main';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, '');
}

export async function GET() {
  const gatewayUrl = (process.env.OPENCLAW_GATEWAY_URL || '').trim();
  const token = (process.env.OPENCLAW_GATEWAY_TOKEN || '').trim();
  const agentId = (process.env.OPENCLAW_AGENT_ID || DEFAULT_AGENT_ID).trim();

  if (!gatewayUrl || !token) {
    return Response.json(
      { ok: false, error: 'OpenClaw is not configured', gatewayUrl: gatewayUrl || null, agentId },
      { status: 500 }
    );
  }

  const baseUrl = normalizeUrl(gatewayUrl);
  const model = `openclaw:${agentId}`;

  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-openclaw-agent-id': agentId,
        'x-openclaw-session-key': 'healthcheck',
      },
      body: JSON.stringify({
        model,
        user: 'healthcheck',
        messages: [
          { role: 'system', content: 'You are Kin. Reply with exactly: ok' },
          { role: 'user', content: 'ok' },
        ],
        max_tokens: 5,
        temperature: 0,
      }),
      cache: 'no-store',
    });

    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text?.slice(0, 500) };
    }

    if (res.ok) {
      return Response.json({ ok: true, baseUrl, model, httpStatus: res.status }, { status: 200 });
    }

    const error = body?.error?.message || body?.message || 'OpenClaw request failed';
    return Response.json({ ok: false, baseUrl, model, httpStatus: res.status, error }, { status: 500 });
  } catch (err: any) {
    return Response.json(
      { ok: false, baseUrl, model, error: err?.message || 'Network error' },
      { status: 500 }
    );
  }
}


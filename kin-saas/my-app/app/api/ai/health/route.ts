const DEFAULT_KIMI_API_URL = 'https://api.moonshot.ai/v1';
const FALLBACK_KIMI_API_URL = 'https://api.moonshot.cn/v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getApiKey() {
  const raw =
    (
    process.env.KIN_AI_API_KEY ||
    process.env.MOONSHOT_API_KEY ||
    process.env.KIMI_API_KEY ||
    ''
    ) || '';

  let key = raw.trim();
  if (/^bearer\s+/i.test(key)) key = key.replace(/^bearer\s+/i, '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/[\r\n]/g, '').trim();
  return key;
}

export async function GET() {
  const apiKey = getApiKey();
  const configuredBaseUrl = process.env.KIN_AI_API_URL || DEFAULT_KIMI_API_URL;
  const model = process.env.KIN_AI_MODEL || 'kimi-k2.5';

  if (!apiKey) {
    return Response.json(
      { ok: false, error: 'Missing KIN_AI_API_KEY', baseUrl: configuredBaseUrl, model },
      { status: 500 }
    );
  }

  try {
    const baseUrls = Array.from(
      new Set([
        configuredBaseUrl,
        configuredBaseUrl === DEFAULT_KIMI_API_URL ? FALLBACK_KIMI_API_URL : DEFAULT_KIMI_API_URL,
      ])
    );

    const attempts: Array<{ baseUrl: string; httpStatus: number; error?: string }> = [];

    for (const baseUrl of baseUrls) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say "ok".' },
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
        return Response.json(
          { ok: true, baseUrl, model, httpStatus: res.status, attempts },
          { status: 200 }
        );
      }

      attempts.push({
        baseUrl,
        httpStatus: res.status,
        error: body?.error?.message || body?.message || 'AI request failed',
      });
    }

    const last = attempts[attempts.length - 1];
    return Response.json(
      {
        ok: false,
        baseUrl: configuredBaseUrl,
        model,
        httpStatus: last?.httpStatus || 500,
        error: last?.error || 'AI request failed',
        attempts,
      },
      { status: 500 }
    );
  } catch (err: any) {
    return Response.json(
      { ok: false, baseUrl: configuredBaseUrl, model, error: err?.message || 'Network error' },
      { status: 500 }
    );
  }
}

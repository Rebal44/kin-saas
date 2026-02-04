const DEFAULT_KIMI_API_URL = 'https://api.moonshot.ai/v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getApiKey() {
  return (
    process.env.KIN_AI_API_KEY ||
    process.env.MOONSHOT_API_KEY ||
    process.env.KIMI_API_KEY ||
    ''
  ).trim();
}

export async function GET() {
  const apiKey = getApiKey();
  const baseUrl = process.env.KIN_AI_API_URL || DEFAULT_KIMI_API_URL;
  const model = process.env.KIN_AI_MODEL || 'kimi-k2.5';

  if (!apiKey) {
    return Response.json(
      { ok: false, error: 'Missing KIN_AI_API_KEY', baseUrl, model },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      cache: 'no-store',
    });

    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text?.slice(0, 500) };
    }

    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          baseUrl,
          model,
          httpStatus: res.status,
          error: body?.error?.message || body?.message || 'AI request failed',
        },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, baseUrl, model, httpStatus: res.status }, { status: 200 });
  } catch (err: any) {
    return Response.json(
      { ok: false, baseUrl, model, error: err?.message || 'Network error' },
      { status: 500 }
    );
  }
}


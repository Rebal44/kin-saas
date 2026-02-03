import { getRequestOrigin } from '@/lib/server/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN');
  return token;
}

export async function GET(request: Request) {
  try {
    const origin = getRequestOrigin(request);
    const url = `${origin}/api/webhooks/telegram`;
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || '';

    const res = await fetch(`https://api.telegram.org/bot${getBotToken()}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        ...(secretToken ? { secret_token: secretToken } : {}),
      }),
    });

    const data = await res.json();
    return Response.json({ ok: true, webhookUrl: url, telegram: data }, { status: 200 });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || 'Failed to set webhook' }, { status: 500 });
  }
}


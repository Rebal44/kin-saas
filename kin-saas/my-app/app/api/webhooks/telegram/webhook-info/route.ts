export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN');
  return token;
}

export async function GET() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${getBotToken()}/getWebhookInfo`, {
      method: 'GET',
    });
    const data = await res.json();
    return Response.json({ ok: true, telegram: data }, { status: 200 });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || 'Failed to get webhook info' }, { status: 500 });
  }
}


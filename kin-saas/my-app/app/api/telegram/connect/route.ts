import { getSupabase } from '@/lib/server/supabase';
import { telegramGetMe } from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: user } = await supabase
      .from('users')
      .select('id, subscription_status')
      .eq('email', email)
      .maybeSingle();

    if (!user?.id) {
      return Response.json({ error: 'No account found for that email' }, { status: 404 });
    }

    const allowedStatuses = new Set(['active', 'trialing']);
    if (!allowedStatuses.has(user.subscription_status)) {
      return Response.json({ error: 'Subscription is not active yet' }, { status: 403 });
    }

    const { data: connection, error: connectionError } = await supabase
      .from('bot_connections')
      .insert({
        user_id: user.id,
        platform: 'telegram',
        is_connected: false,
        is_active: true,
      } as any)
      .select('id')
      .single();

    if (connectionError || !connection?.id) {
      return Response.json({ error: 'Failed to create Telegram connection token' }, { status: 500 });
    }

    const botInfo = await telegramGetMe();
    if (!botInfo?.username) {
      return Response.json({ error: 'Telegram bot is not configured' }, { status: 500 });
    }

    const deepLink = `https://t.me/${botInfo.username}?start=${connection.id}`;
    const appLink = `tg://resolve?domain=${encodeURIComponent(botInfo.username)}&start=${encodeURIComponent(connection.id)}`;
    const startCommand = `/start ${connection.id}`;

    return Response.json({
      connectionId: connection.id,
      botUsername: botInfo.username,
      deepLink,
      appLink,
      startCommand,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to generate connect link' }, { status: 500 });
  }
}

import { getSupabase } from '@/lib/server/supabase';
import { applyCreditTransaction, debitCredits, getCreditBalance, getMonthlyCredits } from '@/lib/server/credits';
import { agentRespond } from '@/lib/server/agent';
import { getRequestOrigin } from '@/lib/server/origin';
import { parseStartCommand, telegramSendMessage } from '@/lib/server/telegram';
import { getStripe } from '@/lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('ok', { status: 200 });
}

export async function POST(request: Request) {
  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token') || '';
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';

  if (configuredSecret && secretHeader !== configuredSecret) {
    return new Response('forbidden', { status: 403 });
  }

  const payload = (await request.json()) as any;
  const message = payload?.message || payload?.edited_message;
  if (!message) return new Response('ok', { status: 200 });

  const chatId = String(message.chat?.id || '');
  if (!chatId) return new Response('ok', { status: 200 });

  const fromUserId = String(message.from?.id || '');
  const username = message.from?.username ? String(message.from.username) : undefined;
  const command = parseSimpleCommand(message.text);

  // Handle /start <token>
  const start = parseStartCommand(message.text);
  if (start.isCommand && start.param) {
    await handleTelegramStart(chatId, start.param, username);
    return new Response('ok', { status: 200 });
  }

  // Find active Telegram connection by chat_id
  const supabase = getSupabase();
  const { data: connection } = await supabase
    .from('bot_connections')
    .select('id, user_id, is_connected')
    .eq('platform', 'telegram')
    .eq('chat_id', chatId)
    .eq('is_connected', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const origin = getRequestOrigin(request);

  if (!connection?.user_id) {
    await telegramSendMessage(
      chatId,
      `Welcome!\n\nTo start using Kin:\n1) Subscribe here: ${origin}\n2) Then connect Telegram here: ${origin}/connect\n\nAfter that, come back and message me again.`
    );
    return new Response('ok', { status: 200 });
  }

  // Subscription gate
  const { data: user } = await supabase
    .from('users')
    .select('id, subscription_status, stripe_customer_id')
    .eq('id', connection.user_id)
    .maybeSingle();

  const allowedStatuses = new Set(['active', 'trialing']);
  if (!user?.id || !allowedStatuses.has(user.subscription_status)) {
    await telegramSendMessage(
      chatId,
      `Your subscription is not active yet.\n\nIf you just paid, wait ~30 seconds and try again.\n\nManage: ${origin}`
    );
    return new Response('ok', { status: 200 });
  }

  // Non-billed commands
  if (command === 'balance' || command === 'credits') {
    try {
      const balance = await getCreditBalance(user.id);
      await telegramSendMessage(
        chatId,
        `Credits: ${balance}\n\nTop up: ${origin}/top-up\nAccount: ${origin}/account`
      );
    } catch {
      await telegramSendMessage(chatId, `Couldn’t load your credits right now. Please try again in a minute.`);
    }
    return new Response('ok', { status: 200 });
  }
  if (command === 'topup' || command === 'top-up') {
    await telegramSendMessage(chatId, `Top up: ${origin}/top-up`);
    return new Response('ok', { status: 200 });
  }
  if (command === 'help') {
    await telegramSendMessage(
      chatId,
      `Commands:\n/balance — show credits\n/topup — buy more credits\n\nOr just send a message to chat with Kin.`
    );
    return new Response('ok', { status: 200 });
  }

  // Credits gate
  const creditsPerMessage = Number(process.env.CREDITS_PER_MESSAGE || 1);
  let debit: { ok: boolean; balance: number };
  try {
    debit = await debitCredits({
      userId: user.id,
      amount: creditsPerMessage,
      reason: 'telegram_message',
      reference: `telegram:inbound:${chatId}:${message.message_id}`,
      metadata: { platform: 'telegram', chatId, messageId: message.message_id },
    });
  } catch (err: any) {
    console.error('credits_debit_failed', err);
    await telegramSendMessage(
      chatId,
      `We couldn’t verify your credits right now. Please try again in ~30 seconds.\n\nIf this keeps happening, open: ${origin}`
    );
    return new Response('ok', { status: 200 });
  }

  if (!debit.ok) {
    const recovered = await maybeRecoverMonthlyCredits({
      userId: user.id,
      stripeCustomerId: user.stripe_customer_id || undefined,
    });

    if (recovered) {
      let retry: { ok: boolean; balance: number };
      try {
        retry = await debitCredits({
          userId: user.id,
          amount: creditsPerMessage,
          reason: 'telegram_message',
          reference: `telegram:inbound:${chatId}:${message.message_id}`,
          metadata: { platform: 'telegram', chatId, messageId: message.message_id },
        });
      } catch (err: any) {
        console.error('credits_debit_retry_failed', err);
        await telegramSendMessage(
          chatId,
          `We couldn’t verify your credits right now. Please try again in ~30 seconds.\n\nIf this keeps happening, open: ${origin}`
        );
        return new Response('ok', { status: 200 });
      }

      if (!retry.ok) {
        await telegramSendMessage(chatId, `You’re out of credits. Top up here: ${origin}/top-up`);
        return new Response('ok', { status: 200 });
      }
    } else {
      await telegramSendMessage(chatId, `You’re out of credits. Top up here: ${origin}/top-up`);
      return new Response('ok', { status: 200 });
    }
  }

  const text = extractTelegramText(message);
  if (!text) {
    await telegramSendMessage(chatId, 'Please send a text message for now.');
    return new Response('ok', { status: 200 });
  }

  // Save incoming
  const { data: incoming } = await supabase
    .from('incoming_messages')
    .insert({
      connection_id: connection.id,
      platform: 'telegram',
      external_id: String(message.message_id),
      from_user: fromUserId || chatId,
      message_type: 'text',
      content: text,
      metadata: { raw_message: message },
    } as any)
    .select('id')
    .single();

  // Conversation container per connection
  const conversationId = await getOrCreateConversationId(user.id, connection.id);

  if (conversationId && incoming?.id) {
    await supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: text,
      message_type: 'text',
      incoming_message_id: incoming.id,
    } as any);
  }

  const history = conversationId ? await getConversationHistory(conversationId, 10) : [];
  const reply = await agentRespond({
    message: text,
    history,
    userId: user.id,
    sessionKey: connection.id,
  });

  const sentOk = await telegramSendMessage(chatId, reply);

  if (conversationId) {
    const { data: outgoing } = await supabase
      .from('outgoing_messages')
      .insert({
        connection_id: connection.id,
        platform: 'telegram',
        to_user: chatId,
        message_type: 'text',
        content: reply,
        status: sentOk ? 'sent' : 'failed',
      } as any)
      .select('id')
      .single();

    await supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
      message_type: 'text',
      outgoing_message_id: outgoing?.id,
    } as any);
  }

  return new Response('ok', { status: 200 });
}

function parseSimpleCommand(text?: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const first = trimmed.split(/\s+/)[0] || '';
  const withoutAt = first.replace(/@.+$/, '');
  const name = withoutAt.replace(/^\//, '').trim().toLowerCase();
  return name || null;
}

async function maybeRecoverMonthlyCredits(params: { userId: string; stripeCustomerId?: string }): Promise<boolean> {
  try {
    const balance = await getCreditBalance(params.userId);
    if (balance > 0) return true;

    const supabase = getSupabase();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, stripe_price_id')
      .eq('user_id', params.userId)
      .order('current_period_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub?.stripe_subscription_id && ['active', 'trialing'].includes(String(sub.status))) {
      const periodStartSeconds = Math.floor(new Date(sub.current_period_start).getTime() / 1000);
      await applyCreditTransaction({
        userId: params.userId,
        delta: getMonthlyCredits(),
        reason: 'monthly_allowance',
        reference: `stripe:subscription_start:${sub.stripe_subscription_id}:${periodStartSeconds}`,
        metadata: { subscriptionId: sub.stripe_subscription_id, periodStart: periodStartSeconds, source: 'telegram_recover' },
      });
      return (await getCreditBalance(params.userId)) > 0;
    }

    if (!params.stripeCustomerId) return false;

    const stripe = getStripe();
    const list = await stripe.subscriptions.list({ customer: params.stripeCustomerId, limit: 5, status: 'all' });
    const candidate = list.data.find((s) => ['active', 'trialing'].includes(s.status)) || null;
    if (!candidate) return false;

    await supabase.from('subscriptions').upsert(
      {
        user_id: params.userId,
        stripe_subscription_id: candidate.id,
        stripe_price_id: candidate.items.data[0]?.price?.id,
        status: candidate.status,
        current_period_start: new Date(candidate.current_period_start * 1000),
        current_period_end: new Date(candidate.current_period_end * 1000),
        cancel_at_period_end: candidate.cancel_at_period_end,
      } as any,
      { onConflict: 'stripe_subscription_id' }
    );

    await supabase
      .from('users')
      .update({
        subscription_status: candidate.status,
        trial_ends_at: candidate.trial_end ? new Date(candidate.trial_end * 1000) : null,
      } as any)
      .eq('id', params.userId);

    await applyCreditTransaction({
      userId: params.userId,
      delta: getMonthlyCredits(),
      reason: 'monthly_allowance',
      reference: `stripe:subscription_start:${candidate.id}:${candidate.current_period_start}`,
      metadata: { subscriptionId: candidate.id, periodStart: candidate.current_period_start, source: 'telegram_recover_stripe' },
    });

    return (await getCreditBalance(params.userId)) > 0;
  } catch (err) {
    console.error('maybeRecoverMonthlyCredits_failed', err);
    return false;
  }
}

async function handleTelegramStart(chatId: string, token: string, username?: string) {
  const supabase = getSupabase();
  const { data: connection } = await supabase
    .from('bot_connections')
    .select('id, platform, is_connected')
    .eq('id', token)
    .maybeSingle();

  if (!connection) {
    await telegramSendMessage(
      chatId,
      'That connect link is invalid or expired. Please generate a new Telegram connect link from the website and try again.'
    );
    return;
  }

  if (connection.platform !== 'telegram') {
    await telegramSendMessage(chatId, 'That connect link is for a different platform.');
    return;
  }

  await supabase
    .from('bot_connections')
    .update({
      is_connected: true,
      connected_at: new Date().toISOString(),
      chat_id: chatId,
      platform_user_id: chatId,
      username: username || null,
      platform_username: username || null,
    } as any)
    .eq('id', token);

  await telegramSendMessage(chatId, '✅ Connected successfully!\n\nYou’re all set. Send me a message any time.');
}

function extractTelegramText(message: any): string {
  if (typeof message.text === 'string') return message.text;
  if (typeof message.caption === 'string') return message.caption;
  return '';
}

async function getOrCreateConversationId(userId: string, connectionId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('connection_id', connectionId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      connection_id: connectionId,
      platform: 'telegram',
    } as any)
    .select('id')
    .single();

  return created?.id || null;
}

async function getConversationHistory(
  conversationId: string,
  limit: number
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const rows = (data || []) as Array<{ role: 'user' | 'assistant'; content: string }>;
  return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
}

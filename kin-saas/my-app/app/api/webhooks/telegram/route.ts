import { supabase } from '@/lib/server/supabase';
import { debitCredits } from '@/lib/server/credits';
import { kimiRespond } from '@/lib/server/kimi';
import { getRequestOrigin } from '@/lib/server/origin';
import { parseStartCommand, telegramSendMessage } from '@/lib/server/telegram';

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

  // Handle /start <token>
  const start = parseStartCommand(message.text);
  if (start.isCommand && start.param) {
    await handleTelegramStart(chatId, start.param, username);
    return new Response('ok', { status: 200 });
  }

  // Find active Telegram connection by chat_id
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
      `Welcome!\n\nTo start using Kin, subscribe and connect Telegram here:\n${origin}\n\nAfter that, come back and message me again.`
    );
    return new Response('ok', { status: 200 });
  }

  // Subscription gate
  const { data: user } = await supabase
    .from('users')
    .select('id, subscription_status')
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

  // Credits gate
  const creditsPerMessage = Number(process.env.CREDITS_PER_MESSAGE || 1);
  const debit = await debitCredits({
    userId: user.id,
    amount: creditsPerMessage,
    reason: 'telegram_message',
    reference: `telegram:inbound:${chatId}:${message.message_id}`,
    metadata: { platform: 'telegram', chatId, messageId: message.message_id },
  });

  if (!debit.ok) {
    await telegramSendMessage(chatId, `You’re out of credits. Top up here: ${origin}/top-up`);
    return new Response('ok', { status: 200 });
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
  const reply = await kimiRespond({ message: text, history });

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

async function handleTelegramStart(chatId: string, token: string, username?: string) {
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
  const { data } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const rows = (data || []) as Array<{ role: 'user' | 'assistant'; content: string }>;
  return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
}


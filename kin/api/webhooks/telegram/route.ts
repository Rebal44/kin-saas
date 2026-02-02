/**
 * POST /api/webhooks/telegram
 * Handle incoming Telegram messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';
import { handleError, successResponse } from '../../lib/errors';

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_size: number;
  }>;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const update: TelegramUpdate = await req.json();
    const message = update.message || update.edited_message;

    if (!message) {
      return successResponse({ ok: true }); // Ack webhook
    }

    const chatId = message.chat.id.toString();
    const text = message.text || '';

    // Find the connection for this chat
    const { data: connection } = await supabaseAdmin
      .from('bot_connections')
      .select('user_id, id')
      .eq('platform', 'telegram')
      .eq('external_id', chatId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      // No active connection found - could trigger onboarding flow
      console.log(`No connection found for Telegram chat ${chatId}`);
      return successResponse({ ok: true });
    }

    // Build metadata
    const metadata: Record<string, unknown> = {};
    if (message.photo) {
      metadata.attachments = message.photo.map(p => ({
        type: 'image',
        file_id: p.file_id,
        size: p.file_size,
      }));
    }

    // Store the conversation
    await supabaseAdmin.from('conversations').insert({
      user_id: connection.user_id,
      bot_connection_id: connection.id,
      direction: 'inbound',
      message: text,
      metadata,
    });

    // Log usage
    await supabaseAdmin.from('usage_logs').insert({
      user_id: connection.user_id,
      action_type: 'message',
      credits_used: 1,
    });

    // TODO: Trigger AI response processing here
    // await processIncomingMessage(connection.user_id, text, metadata);

    return successResponse({ ok: true });
  } catch (error) {
    // Still return 200 to Telegram so they don't retry
    console.error('Telegram webhook error:', error);
    return successResponse({ ok: true });
  }
}

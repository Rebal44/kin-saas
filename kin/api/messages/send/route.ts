/**
 * POST /api/messages/send
 * Send outbound messages to connected platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { APIError, handleError, successResponse } from '../../lib/errors';

interface SendMessageRequest {
  connection_id: string;
  message: string;
  metadata?: Record<string, unknown>;
}

async function handler(
  req: NextRequest,
  ctx: AuthContext
): Promise<NextResponse> {
  try {
    const body: SendMessageRequest = await req.json();

    if (!body.connection_id || !body.message) {
      throw new APIError('Connection ID and message are required', 400);
    }

    // Get the connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('bot_connections')
      .select('*')
      .eq('id', body.connection_id)
      .eq('user_id', ctx.userId)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      throw new APIError('Connection not found or inactive', 404, 'NOT_FOUND');
    }

    // Store outbound message
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id: ctx.userId,
        bot_connection_id: connection.id,
        direction: 'outbound',
        message: body.message,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (convError) {
      throw new APIError('Failed to store message', 500);
    }

    // TODO: Send to actual platform
    // - WhatsApp: Call WhatsApp Business API
    // - Telegram: Call Telegram Bot API

    return successResponse({
      message: 'Message queued for delivery',
      conversation: conversation!,
    });
  } catch (error) {
    return handleError(error);
  }
}

export function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, handler);
}

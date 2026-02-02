/**
 * POST /api/connect/telegram
 * Connect Telegram account
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { APIError, handleError, successResponse } from '../../lib/errors';
import type { ConnectTelegramRequest, ConnectionResponse } from '../../types';

async function handler(
  req: NextRequest,
  ctx: AuthContext
): Promise<NextResponse> {
  try {
    const body: ConnectTelegramRequest = await req.json();
    
    // Validation
    if (!body.chat_id) {
      throw new APIError('Chat ID is required', 400, 'MISSING_CHAT_ID');
    }

    // Check if connection already exists
    const { data: existing } = await supabaseAdmin
      .from('bot_connections')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('platform', 'telegram')
      .eq('external_id', body.chat_id)
      .maybeSingle();

    if (existing) {
      // Reactivate if inactive
      if (!existing.is_active) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('bot_connections')
          .update({ is_active: true })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        const response: ConnectionResponse = {
          connection: updated!,
          message: 'Telegram connection reactivated',
        };
        return successResponse(response);
      }

      throw new APIError('Telegram already connected', 409, 'ALREADY_CONNECTED');
    }

    // TODO: Verify Telegram chat via bot webhook
    // For production, should verify the user owns this chat_id

    const { data: connection, error } = await supabaseAdmin
      .from('bot_connections')
      .insert({
        user_id: ctx.userId,
        platform: 'telegram',
        external_id: body.chat_id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new APIError('Failed to create connection', 500, 'DB_ERROR');
    }

    const response: ConnectionResponse = {
      connection: connection!,
      message: 'Telegram connected successfully',
    };

    return successResponse(response, 201);
  } catch (error) {
    return handleError(error);
  }
}

export function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, handler);
}

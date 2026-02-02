/**
 * POST /api/connect/whatsapp
 * Connect WhatsApp account
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { APIError, handleError, successResponse } from '../../lib/errors';
import type { ConnectWhatsAppRequest, ConnectionResponse } from '../../types';

async function handler(
  req: NextRequest,
  ctx: AuthContext
): Promise<NextResponse> {
  try {
    const body: ConnectWhatsAppRequest = await req.json();
    
    // Validation
    if (!body.phone_number) {
      throw new APIError('Phone number is required', 400, 'MISSING_PHONE');
    }

    // Normalize phone number (remove spaces, ensure + prefix)
    const phoneNumber = body.phone_number.replace(/\s/g, '');
    if (!phoneNumber.startsWith('+')) {
      throw new APIError('Phone number must include country code (+)', 400, 'INVALID_PHONE');
    }

    // Check if connection already exists
    const { data: existing } = await supabaseAdmin
      .from('bot_connections')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('platform', 'whatsapp')
      .eq('external_id', phoneNumber)
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
          message: 'WhatsApp connection reactivated',
        };
        return successResponse(response);
      }

      throw new APIError('WhatsApp already connected', 409, 'ALREADY_CONNECTED');
    }

    // TODO: Trigger WhatsApp verification flow here
    // For now, we'll create the connection directly
    // In production, this should send a verification code first

    const { data: connection, error } = await supabaseAdmin
      .from('bot_connections')
      .insert({
        user_id: ctx.userId,
        platform: 'whatsapp',
        external_id: phoneNumber,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new APIError('Failed to create connection', 500, 'DB_ERROR');
    }

    const response: ConnectionResponse = {
      connection: connection!,
      message: 'WhatsApp connected successfully',
    };

    return successResponse(response, 201);
  } catch (error) {
    return handleError(error);
  }
}

export function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, handler);
}

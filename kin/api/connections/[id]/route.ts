/**
 * DELETE /api/connections/:id
 * Disconnect/remove a bot connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { APIError, handleError, successResponse } from '../../lib/errors';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

async function handler(
  req: NextRequest,
  ctx: AuthContext,
  params: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params.params;

    // Verify the connection belongs to this user
    const { data: connection, error: fetchError } = await supabaseAdmin
      .from('bot_connections')
      .select('*')
      .eq('id', id)
      .eq('user_id', ctx.userId)
      .single();

    if (fetchError || !connection) {
      throw new APIError('Connection not found', 404, 'NOT_FOUND');
    }

    // Soft delete: mark as inactive
    // Or hard delete: .delete().eq('id', id)
    const { error: deleteError } = await supabaseAdmin
      .from('bot_connections')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new APIError('Failed to delete connection', 500, 'DB_ERROR');
    }

    // TODO: Trigger platform-specific cleanup
    // - WhatsApp: remove from WhatsApp Business API
    // - Telegram: remove from bot chat list

    return successResponse({
      message: 'Connection deleted successfully',
      connection_id: id,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(req, (r, ctx) => handler(r, ctx, { params }));
}

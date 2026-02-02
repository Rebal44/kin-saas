/**
 * GET /api/conversations
 * Get conversation history with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { handleError, successResponse } from '../../lib/errors';
import type { ConversationsResponse, ConversationsQueryParams } from '../../types';

async function handler(
  req: NextRequest,
  ctx: AuthContext
): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const params: ConversationsQueryParams = {
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100),
      offset: parseInt(searchParams.get('offset') || '0'),
      bot_connection_id: searchParams.get('bot_connection_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
    };

    // Build query
    let query = supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', ctx.userId);

    // Apply filters
    if (params.bot_connection_id) {
      query = query.eq('bot_connection_id', params.bot_connection_id);
    }

    if (params.start_date) {
      query = query.gte('created_at', params.start_date);
    }

    if (params.end_date) {
      query = query.lte('created_at', params.end_date);
    }

    // Execute query with pagination
    const { data: conversations, error, count } = await query
      .order('created_at', { ascending: false })
      .range(params.offset!, params.offset! + params.limit! - 1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    const response: ConversationsResponse = {
      conversations: conversations || [],
      total: count || 0,
      has_more: (count || 0) > params.offset! + params.limit!,
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, handler);
}

/**
 * GET /api/user/connections
 * Get all bot connections for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { handleError, successResponse } from '../../lib/errors';
import type { ConnectionsResponse } from '../../types';

async function handler(
  req: NextRequest,
  ctx: AuthContext
): Promise<NextResponse> {
  try {
    const { data: connections, error } = await supabaseAdmin
      .from('bot_connections')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('connected_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    const response: ConnectionsResponse = {
      connections: connections || [],
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, handler);
}

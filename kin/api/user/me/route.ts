/**
 * GET /api/user/me
 * Get current user profile with subscription info
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../lib/auth';
import { createServerClient, supabaseAdmin } from '../../lib/supabase';
import { handleError, successResponse } from '../../lib/errors';
import type { UserMeResponse } from '../../types';

async function handler(
  req: NextRequest,
  ctx: AuthContext
): Promise<NextResponse> {
  try {
    // Get user profile
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', ctx.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get active subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get connections count
    const { count: connectionsCount } = await supabaseAdmin
      .from('bot_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .eq('is_active', true);

    const response: UserMeResponse = {
      user,
      subscription: subscription || null,
      connections_count: connectionsCount || 0,
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, handler);
}

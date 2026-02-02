/**
 * GET /api/usage
 * Get usage logs and credit consumption
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { handleError, successResponse } from '../../lib/errors';
import type { UsageResponse, UsageQueryParams, ActionType } from '../../types';

async function handler(
  req: NextRequest,
  ctx: AuthContext
): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const params: UsageQueryParams = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      action_type: (searchParams.get('action_type') as ActionType) || undefined,
    };

    // Default to last 30 days if no dates provided
    const startDate = params.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = params.end_date || new Date().toISOString();

    // Build query
    let query = supabaseAdmin
      .from('usage_logs')
      .select('*')
      .eq('user_id', ctx.userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (params.action_type) {
      query = query.eq('action_type', params.action_type);
    }

    // Get usage logs
    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch usage logs' },
        { status: 500 }
      );
    }

    // Calculate summary
    const { data: summary, error: summaryError } = await supabaseAdmin
      .from('usage_logs')
      .select('action_type, credits_used')
      .eq('user_id', ctx.userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (summaryError) {
      return NextResponse.json(
        { error: 'Failed to calculate usage summary' },
        { status: 500 }
      );
    }

    const summary_counts = {
      messages: summary?.filter(l => l.action_type === 'message').reduce((a, b) => a + b.credits_used, 0) || 0,
      calls: summary?.filter(l => l.action_type === 'call').reduce((a, b) => a + b.credits_used, 0) || 0,
      tasks: summary?.filter(l => l.action_type === 'task').reduce((a, b) => a + b.credits_used, 0) || 0,
    };

    const total_credits = summary_counts.messages + summary_counts.calls + summary_counts.tasks;

    const response: UsageResponse = {
      logs: logs || [],
      total_credits,
      summary: summary_counts,
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, handler);
}

/**
 * Authentication Middleware
 * Validates JWT tokens and extracts user context
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from './supabase';

export interface AuthContext {
  userId: string;
  email: string;
}

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing token' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerClient(token);

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    const context: AuthContext = {
      userId: user.id,
      email: user.email!,
    };

    return handler(req, context);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

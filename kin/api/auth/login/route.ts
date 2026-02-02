/**
 * POST /api/auth/login
 * Authenticate user and return session
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { APIError, handleError, successResponse } from '../../../lib/errors';
import type { LoginRequest, LoginResponse } from '../../../types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: LoginRequest = await req.json();
    
    // Validation
    if (!body.email || !body.password) {
      throw new APIError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (authError) {
      if (authError.message.includes('Invalid login')) {
        throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }
      throw new APIError(authError.message, 401, 'AUTH_ERROR');
    }

    if (!authData.user || !authData.session) {
      throw new APIError('Authentication failed', 401);
    }

    // Fetch user profile from our database
    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (dbError || !user) {
      throw new APIError('User profile not found', 500, 'PROFILE_MISSING');
    }

    const response: LoginResponse = {
      user,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at!,
      },
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

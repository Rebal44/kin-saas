/**
 * POST /api/auth/register
 * Register a new user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { APIError, handleError, successResponse } from '../../../lib/errors';
import type { RegisterRequest, RegisterResponse } from '../../../types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: RegisterRequest = await req.json();
    
    // Validation
    if (!body.email || !body.password) {
      throw new APIError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    if (body.password.length < 8) {
      throw new APIError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    }

    // Create auth user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirm for now
      user_metadata: {
        name: body.name || null,
      },
    });

    if (authError) {
      if (authError.message.includes('already')) {
        throw new APIError('Email already registered', 409, 'EMAIL_EXISTS');
      }
      throw new APIError(authError.message, 400, 'AUTH_ERROR');
    }

    if (!authData.user) {
      throw new APIError('Failed to create user', 500);
    }

    // Create user record in our database
    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: body.email,
        name: body.name || null,
        subscription_status: 'trialing',
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new APIError('Failed to create user profile', 500, 'DB_ERROR');
    }

    // Create session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (sessionError || !sessionData.session) {
      throw new APIError('Registration successful but failed to create session', 500);
    }

    const response: RegisterResponse = {
      user: user!,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at!,
      },
    };

    return successResponse(response, 201);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Supabase Client Configuration
 * Initialize clients for server-side and browser usage
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser-side usage (respects RLS)
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Client for server-side usage (admin access, bypasses RLS)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Server-side client with user auth context
export function createServerClient(accessToken: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

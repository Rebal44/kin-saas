import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseUrlCached: string | null = null;
let supabaseKeyCached: string | null = null;

export function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!supabaseInstance || supabaseUrlCached !== url || supabaseKeyCached !== key) {
    supabaseInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    supabaseUrlCached = url;
    supabaseKeyCached = key;
  }

  return supabaseInstance;
}

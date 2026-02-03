export function formatDbError(error: any): string {
  if (!error) return 'Database error';

  const code = error.code as string | undefined;
  const message = (error.message || error.details || '').toString();

  if (code === '42P01' || message.includes('relation') || message.includes('does not exist')) {
    return 'Database tables are missing. Run Supabase migrations 001 → 003.';
  }

  if (code === '42501' || code === 'PGRST301' || message.includes('permission')) {
    return 'Database permission denied. Verify SUPABASE_SERVICE_ROLE_KEY is correct.';
  }

  if (message.toLowerCase().includes('jwt')) {
    return 'Supabase key is invalid. Verify SUPABASE_SERVICE_ROLE_KEY.';
  }

  return message || 'Database error';
}

export async function assertDatabaseReady(supabase: any): Promise<string | null> {
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) return formatDbError(error);
  return null;
}


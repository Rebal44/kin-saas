import { createClient } from '@supabase/supabase-js';
import { Database } from './schema';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Service role client (for server-side operations)
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Anon client (for client-side operations that need RLS)
export const supabaseAnon = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Connection pool configuration for serverless
export const poolConfig = {
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection not established
  allowExitOnIdle: true       // Allow the pool to exit when idle
};

// Database health check
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency: number }> {
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    const latency = Date.now() - start;
    
    if (error) throw error;
    
    return { healthy: true, latency };
  } catch (error) {
    return { healthy: false, latency: Date.now() - start };
  }
}

// Execute with retry for transient failures
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on connection errors
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

export default supabase;

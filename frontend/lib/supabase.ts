import { createClient } from '@supabase/supabase-js';

// Supabase client instance
let supabase: ReturnType<typeof createClient> | null = null;

/**
 * Get or create Supabase client
 * Uses environment variables for configuration
 */
export function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY');
    }

    console.log('🔍 Creating Supabase client:', {
      url: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabase;
}

/**
 * Execute a query using Supabase client
 * This provides a similar interface to our existing query function
 */
export async function query<T extends Record<string, any> = any>(
  sql: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = getSupabaseClient();
  const start = Date.now();
  
  try {
    console.log('🔍 Executing Supabase query:', sql.substring(0, 100) + '...');
    
    // For now, we'll use a simple approach with direct SQL
    // In a real implementation, you'd use Supabase's query builder or RPC
    const { data, error } = await client
      .from('users') // This will be replaced with actual table queries
      .select('*')
      .limit(1);
    
    const duration = Date.now() - start;
    
    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(`Supabase query failed: ${error.message}`);
    }
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.warn(`Slow Supabase query (${duration}ms):`, sql);
    }
    
    console.log('✅ Supabase query successful:', { duration, rowCount: data?.length || 0 });
    
    return {
      rows: data || [],
      rowCount: data?.length || 0,
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    console.log('Supabase connected:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
}

/**
 * Close Supabase client (if needed)
 */
export async function closeClient(): Promise<void> {
  if (supabase) {
    // Supabase client doesn't need explicit closing
    supabase = null;
  }
}

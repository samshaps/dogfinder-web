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
 * Execute raw SQL using Supabase's REST API
 * This is a workaround since Supabase client doesn't support raw SQL directly
 */
export async function query<T extends Record<string, any> = any>(
  sql: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = getSupabaseClient();
  const start = Date.now();
  
  try {
    console.log('🔍 Executing Supabase raw SQL:', sql.substring(0, 100) + '...');
    
    // Use Supabase's REST API for raw SQL execution
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        query: sql,
        params: params || []
      })
    });

    const duration = Date.now() - start;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase query error:', errorText);
      throw new Error(`Supabase query failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
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

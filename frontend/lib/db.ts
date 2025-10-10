import { Pool } from 'pg';

// Singleton pool instance
let pool: Pool | null = null;

/**
 * Get or create database connection pool
 * Uses connection string from POSTGRES_URL environment variable
 */
export function getPool(): Pool {
  if (!pool) {
    // Try POSTGRES_URL first (for Vercel/Supabase), then DATABASE_URL (for local development)
    let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('Neither POSTGRES_URL nor DATABASE_URL environment variable is set');
    }

    // Parse connection string to extract SSL config
    const url = new URL(connectionString);
    const isSupabase = url.hostname.includes('supabase.co');
    const isProduction = process.env.NODE_ENV === 'production';
    const isStaging = process.env.VERCEL_ENV === 'preview';
    
    console.log('🔍 Database connection config:', {
      hostname: url.hostname,
      isSupabase,
      isProduction,
      isStaging,
      hasConnectionString: !!connectionString,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });
    
    // For Supabase, try multiple SSL approaches
    let poolConfig: any = {
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    if (isSupabase || isProduction || isStaging) {
      console.log('🔍 Configuring SSL for Supabase/Production...');
      
      // Try the most permissive SSL config possible
      poolConfig.ssl = {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined, // Disable hostname verification
      };
      
      // Also try modifying connection string
      const sslParams = new URLSearchParams({
        sslmode: 'require',
        sslcert: 'disable',
        sslkey: 'disable',
        sslrootcert: 'disable'
      });
      
      if (connectionString.includes('?')) {
        connectionString += '&' + sslParams.toString();
      } else {
        connectionString += '?' + sslParams.toString();
      }
      
      poolConfig.connectionString = connectionString;
      console.log('🔍 Final connection config:', {
        hasSSL: !!poolConfig.ssl,
        sslConfig: poolConfig.ssl,
        connectionString: connectionString.replace(/password=[^&]*/, 'password=***')
      });
    }
    
    pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
      process.exit(-1);
    });
  }

  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.warn(`Slow query (${duration}ms):`, text);
    }
    
    return {
      rows: res.rows,
      rowCount: res.rowCount || 0,
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
    console.log('Database connected:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Close database connection pool
 * Call this during graceful shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}


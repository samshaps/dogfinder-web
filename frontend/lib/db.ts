import { Pool } from 'pg';

// Singleton pool instance
let pool: Pool | null = null;

/**
 * Get or create database connection pool
 * Uses connection string from DATABASE_URL environment variable
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      max: 20, // Maximum number of clients in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

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


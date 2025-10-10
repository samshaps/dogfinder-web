import { Pool } from 'pg';

// Alternative database connection approach
let pool: Pool | null = null;

export function getPoolAlternative(): Pool {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('Neither POSTGRES_URL nor DATABASE_URL environment variable is set');
    }

    console.log('🔍 Alternative DB connection - trying with minimal SSL config...');

    // Try with absolutely minimal SSL configuration
    pool = new Pool({
      connectionString,
      max: 5, // Smaller pool for testing
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      // No SSL config at all - let the connection string handle it
    });

    pool.on('error', (err) => {
      console.error('Alternative DB pool error:', err);
    });
  }

  return pool;
}

// Simple query function for testing
export async function queryAlternative(text: string, params?: any[]) {
  const pool = getPoolAlternative();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

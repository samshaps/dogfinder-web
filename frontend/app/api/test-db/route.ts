import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Get the pool
    const pool = getPool();
    console.log('✅ Pool created successfully');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Client connected successfully');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Query executed successfully:', result.rows[0]);
    
    // Test inserting a test record
    const testInsert = await client.query(`
      INSERT INTO users (email, name, provider, provider_account_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, ['test@example.com', 'Test User', 'test', 'test123']);
    
    console.log('✅ Test insert completed:', testInsert.rows[0] || 'No new record (already exists)');
    
    // Clean up
    client.release();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful',
      data: {
        currentTime: result.rows[0].current_time,
        dbVersion: result.rows[0].db_version,
        testInsert: testInsert.rows[0] || 'Record already exists'
      }
    });
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      details: error
    }, { status: 500 });
  }
}

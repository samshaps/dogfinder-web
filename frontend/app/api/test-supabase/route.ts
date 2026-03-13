import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, testSupabaseConnection } from '@/lib/supabase-auth';
import { requireNonProduction } from '@/lib/api/helpers';

export async function GET(request: NextRequest) {
  const prodGuard = requireNonProduction();
  if (prodGuard) return prodGuard;

  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test basic connection
    const connectionTest = await testSupabaseConnection();
    console.log('🔍 Connection test result:', connectionTest);
    
    // Test simple query
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users' as any)
      .select('count')
      .limit(1);
    
    console.log('🔍 Users query result:', { data, error });
    
    return NextResponse.json({
      connectionTest,
      usersQuery: { data, error },
      message: 'Supabase test completed'
    });
    
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
    return NextResponse.json(
      { 
        error: 'Supabase test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

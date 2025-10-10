import { createClient } from '@supabase/supabase-js';

// Supabase client for authentication operations
let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    console.log('🔍 Creating Supabase auth client:', {
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
 * Check if user exists by email
 */
export async function getUserByEmail(email: string): Promise<{ id: string } | null> {
  const client = getSupabaseClient();
  
  console.log('🔍 Checking if user exists:', email);
  
  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking user:', error);
    throw error;
  }
  
  console.log('✅ User check result:', data ? 'Found' : 'Not found');
  return data;
}

/**
 * Create a new user
 */
export async function createUser(userData: {
  email: string;
  name: string;
  image?: string;
  provider: string;
  provider_account_id: string;
}): Promise<{ id: string } | null> {
  const client = getSupabaseClient();
  
  console.log('🔍 Creating new user:', userData.email);
  
  const { data, error } = await client
    .from('users')
    .insert([userData])
    .select('id')
    .single();
    
  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }
  
  console.log('✅ User created:', data);
  return data;
}

/**
 * Create default plan for user
 */
export async function createUserPlan(userId: string) {
  const client = getSupabaseClient();
  
  console.log('🔍 Creating default plan for user:', userId);
  
  const { data, error } = await client
    .from('plans')
    .insert([{
      user_id: userId,
      tier: 'free',
      status: 'active'
    }])
    .select('*')
    .single();
    
  if (error) {
    console.error('Error creating user plan:', error);
    throw error;
  }
  
  console.log('✅ User plan created:', data);
  return data;
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    
    // Test with a simple query
    const { data, error } = await client
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
}

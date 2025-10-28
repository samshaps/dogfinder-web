import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Get Supabase client for server-side operations
 * Uses service role key when available (bypasses RLS), otherwise falls back to anon key
 */
export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  if (!serviceRoleKey && !anonKey) {
    throw new Error('Missing Supabase API key. Please set either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Use service role key if available (for server-side operations that need to bypass RLS)
  const apiKey: string = serviceRoleKey || anonKey!; // Safe to use ! here since we checked above
  const usingServiceRole = !!serviceRoleKey;

  // Create a new client - always use service role key for server-side operations when available
  const client = createClient(supabaseUrl, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Creating Supabase client:', {
    url: supabaseUrl,
    usingServiceRole,
    hasServiceRoleKey: !!serviceRoleKey,
    hasAnonKey: !!anonKey,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });

  return client;
}

/**
 * Check if user exists by email
 */
export async function getUserByEmail(email: string): Promise<{ id: string } | null> {
  const client = getSupabaseClient();
  
  console.log('🔍 Checking if user exists:', email);
  
  const { data, error } = await (client as any)
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
  
  const { data, error } = await (client as any)
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
  
  const { data, error } = await (client as any)
    .from('plans')
    .insert([{
      user_id: userId,
      plan_type: 'free',
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
 * Get user preferences by user ID
 */
export async function getUserPreferences(userId: string): Promise<any | null> {
  const client = getSupabaseClient();
  
  console.log('🔍 Getting user preferences for:', userId);
  
  const { data, error } = await (client as any)
    .from('preferences')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error getting user preferences:', error);
    throw error;
  }
  
  console.log('✅ User preferences result:', data ? 'Found' : 'Not found');
  return data;
}

/**
 * Create or update user preferences
 */
export async function saveUserPreferences(userId: string, preferencesData: any): Promise<any> {
  const client = getSupabaseClient();
  
  console.log('🔍 Saving user preferences for:', userId);
  console.log('🔍 Preferences data to save:', JSON.stringify(preferencesData, null, 2));
  
  // Check if preferences already exist (use maybeSingle to avoid error if no rows)
  // Note: preferences table uses user_id as PRIMARY KEY, not a separate id column
  const { data: existingData, error: checkError } = await (client as any)
    .from('preferences')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is fine, but other errors are real problems
    console.error('❌ Error checking for existing preferences:', checkError);
    console.error('❌ Check error code:', checkError.code);
    console.error('❌ Check error message:', checkError.message);
    console.error('❌ Check error details:', checkError.details);
    throw checkError;
  }
    
  // Map the new schema fields to the database schema
  // Database has: location, radius, breed, size, age, gender, lifestyle, notes
  // Code uses: zip_codes, age_preferences, size_preferences, energy_level, include_breeds, exclude_breeds, temperament_traits, living_situation
  const dbData: any = {
    user_id: userId,
    location: preferencesData.zip_codes && preferencesData.zip_codes.length > 0 
      ? preferencesData.zip_codes[0] 
      : null,
    radius: 50, // Default radius
    // Map breeds - combine include and exclude into notes for now, or store in lifestyle JSONB
    breed: preferencesData.include_breeds || null,
    size: preferencesData.size_preferences || null,
    age: preferencesData.age_preferences || null,
    // Store additional data in lifestyle JSONB field
    lifestyle: {
      zip_codes: preferencesData.zip_codes || [],
      energy_level: preferencesData.energy_level || null,
      include_breeds: preferencesData.include_breeds || [],
      exclude_breeds: preferencesData.exclude_breeds || [],
      temperament_traits: preferencesData.temperament_traits || [],
      living_situation: preferencesData.living_situation || {},
    },
    notes: preferencesData.living_situation?.description || null,
  };
    
  if (existingData) {
    // Update existing preferences
    console.log('🔍 Updating existing preferences for user_id:', userId);
    console.log('🔍 DB data to update:', JSON.stringify(dbData, null, 2));
    
    const { data, error } = await (client as any)
      .from('preferences')
      .update(dbData)
      .eq('user_id', userId)
      .select('*')
      .single();
      
    if (error) {
      console.error('❌ Error updating preferences:', error);
      console.error('❌ Update error code:', error.code);
      console.error('❌ Update error message:', error.message);
      console.error('❌ Update error details:', error.details);
      console.error('❌ Update error hint:', error.hint);
      throw error;
    }
    
    console.log('✅ Preferences updated:', data);
    return data;
  } else {
    // Create new preferences
    console.log('🔍 Creating new preferences...');
    console.log('🔍 DB data to insert:', JSON.stringify(dbData, null, 2));
    
    const { data, error } = await (client as any)
      .from('preferences')
      .insert([dbData])
      .select('*')
      .single();
      
    if (error) {
      console.error('❌ Error creating preferences:', error);
      console.error('❌ Insert error code:', error.code);
      console.error('❌ Insert error message:', error.message);
      console.error('❌ Insert error details:', error.details);
      console.error('❌ Insert error hint:', error.hint);
      throw error;
    }
    
    console.log('✅ Preferences created:', data);
    return data;
  }
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    
    // Test with a simple query
    const { data, error } = await (client as any)
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

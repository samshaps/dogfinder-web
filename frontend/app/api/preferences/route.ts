import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSupabaseClient, getUserPreferences, saveUserPreferences } from '@/lib/supabase-auth';
import { requireSession, okJson, errJson, ApiErrors } from '@/lib/api/helpers';
import { z } from 'zod';

// Validation schema for user preferences (updated to match form data)
const PreferencesSchema = z.object({
  zip_codes: z.array(z.string().regex(/^\d{5}$/)).optional(),
  age_preferences: z.array(z.enum(['baby', 'young', 'adult', 'senior'])).optional(),
  size_preferences: z.array(z.enum(['small', 'medium', 'large', 'xl'])).optional(),
  energy_level: z.enum(['low', 'medium', 'high']).optional(),
  include_breeds: z.array(z.string()).optional(),
  exclude_breeds: z.array(z.string()).optional(),
  temperament_traits: z.array(z.string()).optional(),
  living_situation: z.object({
    description: z.string().optional(),
    has_yard: z.boolean().optional(),
    has_children: z.boolean().optional(),
    has_other_pets: z.boolean().optional(),
    activity_level: z.enum(['low', 'medium', 'high']).optional(),
  }).optional(),
  // notification_preferences: z.object({
  //   email_alerts: z.boolean().optional(),
  //   frequency: z.enum(['daily', 'weekly']).optional(),
  // }).optional(), // Column doesn't exist in database schema
});

// GET /api/preferences - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const { session, response } = await requireSession(request);
    if (response) return response;

    const userEmail = session.user?.email;
    if (!userEmail) {
      return errJson(ApiErrors.unauthorized('User email not found in session'), request);
    }

    // Get user ID from email using Supabase
    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client
      .from('users' as any)
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      return errJson(ApiErrors.notFound('User'), request);
    }

    const userId = (userData as any).id;

    // Get user preferences using Supabase
    const preferences = await getUserPreferences(userId);

    if (!preferences) {
      return okJson({
        preferences: null,
        message: 'No preferences found'
      }, request);
    }
    
    return okJson({
      preferences: {
        id: preferences.id,
        zip_codes: preferences.zip_codes || [],
        age_preferences: preferences.age_preferences || [],
        size_preferences: preferences.size_preferences || [],
        energy_level: preferences.energy_level,
        include_breeds: preferences.include_breeds || [],
        exclude_breeds: preferences.exclude_breeds || [],
        temperament_traits: preferences.temperament_traits || [],
        living_situation: preferences.living_situation || {},
        notification_preferences: preferences.notification_preferences || {},
        created_at: preferences.created_at,
        updated_at: preferences.updated_at,
      }
    }, request);

  } catch (error) {
    console.error('Error fetching preferences:', error);
    return errJson(ApiErrors.internalError('Failed to fetch preferences'), request);
  }
}

// POST /api/preferences - Create or update user preferences
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/preferences started');
    
    const { session, response } = await requireSession(request);
    if (response) return response;

    const body = await request.json();
    console.log('🔍 Request body:', body);
    
    // Validate the request body
    const validatedData = PreferencesSchema.parse(body);
    console.log('✅ Validation passed:', validatedData);

    // Get user ID from email using Supabase
    console.log('🔍 Getting Supabase client...');
    const client = getSupabaseClient();
    
    const userEmail = session.user?.email;
    if (!userEmail) {
      return errJson(ApiErrors.unauthorized('User email not found in session'), request);
    }
    
    console.log('🔍 Looking up user by email:', userEmail);
    const { data: userData, error: userError } = await client
      .from('users' as any)
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      console.error('❌ User lookup failed:', userError);
      return errJson(ApiErrors.notFound('User'), request);
    }

    const userId = (userData as any).id;
    console.log('✅ User found:', userId);

    // Prepare preferences data for Supabase
    const preferencesData = {
      zip_codes: validatedData.zip_codes || [],
      age_preferences: validatedData.age_preferences || [],
      size_preferences: validatedData.size_preferences || [],
      energy_level: validatedData.energy_level,
      include_breeds: validatedData.include_breeds || [],
      exclude_breeds: validatedData.exclude_breeds || [],
      temperament_traits: validatedData.temperament_traits || [],
      living_situation: validatedData.living_situation || {},
      // notification_preferences: validatedData.notification_preferences || {}, // Column doesn't exist in DB
    };

    console.log('🔍 Saving preferences data:', preferencesData);

    // Save preferences using Supabase
    const result = await saveUserPreferences(userId, preferencesData);
    console.log('✅ Preferences saved successfully:', result);

    return okJson({
      message: 'Preferences saved successfully',
      preferences: result
    }, request);

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return errJson(
        ApiErrors.validationError('Invalid preferences data', { validationErrors: error.errors }),
        request
      );
    }

    console.error('Error saving preferences:', error);
    return errJson(ApiErrors.internalError('Failed to save preferences'), request);
  }
}

// DELETE /api/preferences - Delete user preferences
export async function DELETE(request: NextRequest) {
  try {
    const { session, response } = await requireSession(request);
    if (response) return response;

    // Get user ID from email using Supabase
    const userEmail = session.user?.email;
    if (!userEmail) {
      return errJson(ApiErrors.unauthorized('User email not found in session'), request);
    }
    
    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client
      .from('users' as any)
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      return errJson(ApiErrors.notFound('User'), request);
    }

    const userId = (userData as any).id;

    // Delete preferences using Supabase
    const { data, error } = await client
      .from('preferences' as any)
      .delete()
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error deleting preferences:', error);
      return errJson(ApiErrors.internalError('Failed to delete preferences'), request);
    }

    if (!data) {
      return errJson(ApiErrors.notFound('Preferences'), request);
    }

    return okJson({
      message: 'Preferences deleted successfully'
    }, request);

  } catch (error) {
    console.error('Error deleting preferences:', error);
    return errJson(ApiErrors.internalError('Failed to delete preferences'), request);
  }
}

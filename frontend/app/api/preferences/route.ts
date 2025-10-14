import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSupabaseClient, getUserPreferences, saveUserPreferences } from '@/lib/supabase-auth';
import { z } from 'zod';

// Validation schema for user preferences
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
  notification_preferences: z.object({
    email_alerts: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly']).optional(),
  }).optional(),
});

// GET /api/preferences - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user ID from email using Supabase
    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client
      .from('users' as any)
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userData.id;

    // Get user preferences using Supabase
    const preferences = await getUserPreferences(userId);

    if (!preferences) {
      return NextResponse.json({
        preferences: null,
        message: 'No preferences found'
      });
    }
    
    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// POST /api/preferences - Create or update user preferences
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/preferences started');
    
    const session = await getServerSession();
    console.log('🔍 Session:', session ? 'Found' : 'Not found');
    
    if (!session?.user?.email) {
      console.log('❌ No session or email found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('🔍 Request body:', body);
    
    // Validate the request body
    const validatedData = PreferencesSchema.parse(body);
    console.log('✅ Validation passed:', validatedData);

    // Get user ID from email using Supabase
    console.log('🔍 Getting Supabase client...');
    const client = getSupabaseClient();
    
    console.log('🔍 Looking up user by email:', session.user.email);
    const { data: userData, error: userError } = await client
      .from('users' as any)
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      console.error('❌ User lookup failed:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userData.id;
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
      notification_preferences: validatedData.notification_preferences || {},
    };

    console.log('🔍 Saving preferences data:', preferencesData);

    // Save preferences using Supabase
    const result = await saveUserPreferences(userId, preferencesData);
    console.log('✅ Preferences saved successfully:', result);

    return NextResponse.json({
      message: 'Preferences saved successfully',
      preferences: result
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid preferences data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving preferences:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to save preferences',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/preferences - Delete user preferences
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user ID from email
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id;

    // Delete preferences
    const deleteResult = await query(
      'DELETE FROM preferences WHERE user_id = $1 RETURNING id',
      [userId]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No preferences found to delete' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Preferences deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting preferences:', error);
    return NextResponse.json(
      { error: 'Failed to delete preferences' },
      { status: 500 }
    );
  }
}

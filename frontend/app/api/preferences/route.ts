import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { query } from '@/lib/db';
import { z } from 'zod';

// Validation schema for user preferences
const PreferencesSchema = z.object({
  zip_codes: z.array(z.string().regex(/^\d{5}$/)).optional(),
  age_preferences: z.array(z.enum(['puppy', 'young', 'adult', 'senior'])).optional(),
  size_preferences: z.array(z.enum(['small', 'medium', 'large'])).optional(),
  energy_level: z.enum(['low', 'medium', 'high']).optional(),
  include_breeds: z.array(z.string()).optional(),
  exclude_breeds: z.array(z.string()).optional(),
  temperament_traits: z.array(z.string()).optional(),
  living_situation: z.object({
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

    // Get user preferences
    const preferencesResult = await query(
      'SELECT * FROM preferences WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    if (preferencesResult.rows.length === 0) {
      return NextResponse.json({
        preferences: null,
        message: 'No preferences found'
      });
    }

    const preferences = preferencesResult.rows[0];
    
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
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = PreferencesSchema.parse(body);

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

    // Check if preferences already exist
    const existingResult = await query(
      'SELECT id FROM preferences WHERE user_id = $1',
      [userId]
    );

    if (existingResult.rows.length > 0) {
      // Update existing preferences
      const updateResult = await query(
        `UPDATE preferences SET 
          zip_codes = $2,
          age_preferences = $3,
          size_preferences = $4,
          energy_level = $5,
          include_breeds = $6,
          exclude_breeds = $7,
          temperament_traits = $8,
          living_situation = $9,
          notification_preferences = $10,
          updated_at = NOW()
        WHERE user_id = $1
        RETURNING *`,
        [
          userId,
          JSON.stringify(validatedData.zip_codes || []),
          JSON.stringify(validatedData.age_preferences || []),
          JSON.stringify(validatedData.size_preferences || []),
          validatedData.energy_level,
          JSON.stringify(validatedData.include_breeds || []),
          JSON.stringify(validatedData.exclude_breeds || []),
          JSON.stringify(validatedData.temperament_traits || []),
          JSON.stringify(validatedData.living_situation || {}),
          JSON.stringify(validatedData.notification_preferences || {}),
        ]
      );

      return NextResponse.json({
        message: 'Preferences updated successfully',
        preferences: updateResult.rows[0]
      });
    } else {
      // Create new preferences
      const insertResult = await query(
        `INSERT INTO preferences (
          user_id, zip_codes, age_preferences, size_preferences, 
          energy_level, include_breeds, exclude_breeds, 
          temperament_traits, living_situation, notification_preferences
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          userId,
          JSON.stringify(validatedData.zip_codes || []),
          JSON.stringify(validatedData.age_preferences || []),
          JSON.stringify(validatedData.size_preferences || []),
          validatedData.energy_level,
          JSON.stringify(validatedData.include_breeds || []),
          JSON.stringify(validatedData.exclude_breeds || []),
          JSON.stringify(validatedData.temperament_traits || []),
          JSON.stringify(validatedData.living_situation || {}),
          JSON.stringify(validatedData.notification_preferences || {}),
        ]
      );

      return NextResponse.json({
        message: 'Preferences created successfully',
        preferences: insertResult.rows[0]
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid preferences data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
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

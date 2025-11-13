import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { query } from '@/lib/db';
import { z } from 'zod';

// Validation schema for search history
const SearchHistorySchema = z.object({
  search_query: z.object({
    zip_codes: z.array(z.string()).optional(),
    age_preferences: z.array(z.string()).optional(),
    size_preferences: z.array(z.string()).optional(),
    energy_level: z.string().optional(),
    include_breeds: z.array(z.string()).optional(),
    exclude_breeds: z.array(z.string()).optional(),
    temperament_traits: z.array(z.string()).optional(),
  }),
  results_count: z.number().optional(),
  search_duration_ms: z.number().optional(),
});

// GET /api/search-history - Get user's search history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Get search history with pagination
    const historyResult = await query(
      `SELECT 
        id,
        search_query,
        results_count,
        search_duration_ms,
        created_at
      FROM preferences 
      WHERE user_id = $1 
        AND search_query IS NOT NULL
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total 
      FROM preferences 
      WHERE user_id = $1 
        AND search_query IS NOT NULL`,
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);

    const searchHistory = historyResult.rows.map(row => ({
      id: row.id,
      search_query: row.search_query,
      results_count: row.results_count,
      search_duration_ms: row.search_duration_ms,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      search_history: searchHistory,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      }
    });

  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search history' },
      { status: 500 }
    );
  }
}

// POST /api/search-history - Record a new search
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
    const validatedData = SearchHistorySchema.parse(body);

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

    // Insert search history record
    const insertResult = await query(
      `INSERT INTO preferences (
        user_id,
        search_query,
        results_count,
        search_duration_ms
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, created_at`,
      [
        userId,
        JSON.stringify(validatedData.search_query),
        validatedData.results_count || 0,
        validatedData.search_duration_ms || 0,
      ]
    );

    return NextResponse.json({
      message: 'Search recorded successfully',
      search_id: insertResult.rows[0].id,
      created_at: insertResult.rows[0].created_at,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error recording search:', error);
    return NextResponse.json(
      { error: 'Failed to record search' },
      { status: 500 }
    );
  }
}

// DELETE /api/search-history - Clear user's search history
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

    // Clear search history (set search_query to NULL)
    const deleteResult = await query(
      `UPDATE preferences 
      SET search_query = NULL, results_count = NULL, search_duration_ms = NULL
      WHERE user_id = $1 AND search_query IS NOT NULL
      RETURNING id`,
      [userId]
    );

    return NextResponse.json({
      message: 'Search history cleared successfully',
      records_cleared: deleteResult.rows.length,
    });

  } catch (error) {
    console.error('Error clearing search history:', error);
    return NextResponse.json(
      { error: 'Failed to clear search history' },
      { status: 500 }
    );
  }
}

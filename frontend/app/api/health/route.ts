import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint
 * Returns database connection status and server info
 * 
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Test database connection
    const dbConnected = await testConnection();

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbConnected ? 'connected' : 'disconnected',
      responseTime: Date.now() - startTime,
      environment: process.env.NODE_ENV,
    };

    return NextResponse.json(response, {
      status: dbConnected ? 200 : 503,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: errorMessage,
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}


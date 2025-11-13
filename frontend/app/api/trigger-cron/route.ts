/**
 * Test endpoint for manually triggering the email alerts cron job
 * Usage:
 *   POST /api/trigger-cron
 *   Headers: { "Authorization": "Bearer ADMIN_SECRET" } (optional in dev mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { appConfig } from '@/lib/config';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - allow in dev mode without auth, require ADMIN_SECRET or CRON_SECRET in production
    const authHeader = request.headers.get('authorization');
    const isProduction = process.env.VERCEL_ENV === 'production';
    // Try ADMIN_SECRET first, fall back to appropriate CRON_SECRET for convenience
    const adminSecret = process.env.ADMIN_SECRET 
      || (isProduction ? appConfig.cronSecretProd : appConfig.cronSecretStaging)
      || 'admin-secret';
    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
    
    if (!isDev && (!authHeader || authHeader !== `Bearer ${adminSecret}`)) {
      const secretName = process.env.ADMIN_SECRET ? 'ADMIN_SECRET' : (isProduction ? 'CRON_SECRET_PROD' : 'CRON_SECRET_STAGING');
      return NextResponse.json(
        { error: `Unauthorized. Provide Authorization: Bearer <${secretName}> header` },
        { status: 401 }
      );
    }

    console.log('🔄 Manual cron trigger requested');

    // Get the appropriate cron secret based on environment
    const cronSecret = isProduction 
      ? appConfig.cronSecretProd 
      : appConfig.cronSecretStaging;

    // Construct the cron endpoint URL
    let baseUrl = appConfig.publicBaseUrl;
    if (!baseUrl) {
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://dogyenta.com';
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }

    const cronUrl = `${baseUrl}/api/cron/email-alerts`;

    console.log('📡 Calling cron endpoint:', cronUrl);

    // Call the cron endpoint with proper authentication
    const cronAuthHeader = cronSecret ? `Bearer ${cronSecret}` : undefined;
    
    const response = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronAuthHeader ? { 'Authorization': cronAuthHeader } : {}),
      },
      cache: 'no-store',
    });

    const responseData = await response.json().catch(() => ({
      error: 'Failed to parse response',
      status: response.status,
      statusText: response.statusText,
    }));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cron job execution failed',
          status: response.status,
          statusText: response.statusText,
          details: responseData,
        },
        { status: response.status }
      );
    }

    // Format results for better readability
    const formattedResults = {
      success: true,
      message: 'Cron job triggered successfully',
      cronUrl,
      timestamp: new Date().toISOString(),
      summary: {
        processed: responseData.processed || 0,
        sent: responseData.sent || 0,
        errors: responseData.errors || 0,
        totalUsers: responseData.results?.length || 0,
      },
      results: responseData.results || [],
      debug: responseData.debug,
      // Add a breakdown by status
      statusBreakdown: responseData.results ? {
        sent: responseData.results.filter((r: any) => r.status === 'sent').length,
        already_sent_today: responseData.results.filter((r: any) => r.status === 'already_sent_today').length,
        no_prefs: responseData.results.filter((r: any) => r.status === 'no_prefs').length,
        no_matches: responseData.results.filter((r: any) => r.status === 'no_matches').length,
        no_new_matches: responseData.results.filter((r: any) => r.status === 'no_new_matches').length,
        paused: responseData.results.filter((r: any) => r.status === 'paused').length,
        error: responseData.results.filter((r: any) => r.status === 'error').length,
      } : {},
      // Full raw response for debugging
      rawResponse: responseData,
    };

    return NextResponse.json(formattedResults);

  } catch (error) {
    console.error('❌ Trigger cron endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        note: 'Make sure the cron endpoint is accessible and properly configured.',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for usage instructions
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/trigger-cron',
    method: 'POST',
    description: 'Manually trigger the email alerts cron job to test email sending',
    usage: {
      url: '/api/trigger-cron',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer <ADMIN_SECRET> (optional in dev mode)',
      },
    },
    example: {
      curl: `curl -X POST http://localhost:3000/api/trigger-cron \\
  -H "Authorization: Bearer your-admin-secret"`,
    },
    note: 'In development mode, authentication is optional. In production, you must provide a valid ADMIN_SECRET. This endpoint will call the actual cron job endpoint with proper authentication.',
    cronEndpoint: '/api/cron/email-alerts',
    schedule: 'Scheduled to run daily at 12pm Eastern (5pm UTC) via Vercel cron',
  });
}


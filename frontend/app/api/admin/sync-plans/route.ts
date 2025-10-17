/**
 * Admin endpoint for plan synchronization
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllPlansWithStripe, findPlanMismatches, validatePlanConsistency } from '@/lib/stripe/plan-sync';
import { appConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    // Simple admin authentication (in production, use proper admin auth)
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET || 'admin-secret';
    
    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json().catch(() => ({}));
    
    switch (action) {
      case 'sync':
        console.log('🔄 Starting plan synchronization...');
        const syncResult = await syncAllPlansWithStripe();
        return NextResponse.json({
          success: true,
          action: 'sync',
          result: syncResult
        });

      case 'find-mismatches':
        console.log('🔍 Finding plan mismatches...');
        const mismatches = await findPlanMismatches();
        return NextResponse.json({
          success: true,
          action: 'find-mismatches',
          mismatches,
          count: mismatches.length
        });

      case 'validate':
        console.log('✅ Validating plan consistency...');
        const validation = await validatePlanConsistency();
        return NextResponse.json({
          success: true,
          action: 'validate',
          validation
        });

      default:
        return NextResponse.json({
          success: true,
          actions: ['sync', 'find-mismatches', 'validate'],
          usage: 'POST with { "action": "sync|find-mismatches|validate" }'
        });
    }

  } catch (error) {
    console.error('❌ Admin sync plans error:', error);
    return NextResponse.json(
      { 
        error: 'Plan synchronization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

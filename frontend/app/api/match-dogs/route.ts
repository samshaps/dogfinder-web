import { NextRequest, NextResponse } from 'next/server';
import { processDogMatching, validateMatchingResults } from '@/lib/matching-flow';
import { UserPreferences, Dog } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] 🎯 Match-dogs API POST endpoint called`);
  
  try {
    const parseStartTime = Date.now();
    console.log(`[${requestId}] 📥 Parsing request body...`);
    const body = await request.json();
    const parseDuration = Date.now() - parseStartTime;
    console.log(`[${requestId}] 📝 Request body parsed in ${parseDuration}ms, keys:`, Object.keys(body));
    
    const { userPreferences, dogs } = body;
    const dogCount = Array.isArray(dogs) ? dogs.length : 0;
    const hasGuidance = !!(userPreferences?.guidance);
    
    // Validate input
    console.log('🔍 Validating input...');
    console.log('🔍 userPreferences:', userPreferences);
    console.log('🔍 dogs:', Array.isArray(dogs) ? `${dogs.length} dogs` : 'not an array');
    
    if (!userPreferences || !dogs || !Array.isArray(dogs)) {
      console.error('❌ Validation failed: Invalid input');
      return NextResponse.json(
        { error: 'Invalid request: userPreferences and dogs array required' },
        { status: 400 }
      );
    }
    
    console.log('✅ Validation passed');
    // Dev-friendly defaults to avoid empty zipCodes causing validation failures during local testing
    if (process.env.NODE_ENV !== 'production') {
      if (!userPreferences.zipCodes || userPreferences.zipCodes.length === 0) {
        userPreferences.zipCodes = ['10001'];
      }
      if (!userPreferences.radiusMi) {
        userPreferences.radiusMi = 50;
      }
    }
    console.log('🎯 API: Processing dog matching for', dogs.length, 'dogs');
    console.log('🎯 API: User preferences:', userPreferences);
    
    // Process the matching
    const matchingStartTime = Date.now();
    console.log(`[${requestId}] 🔄 Calling processDogMatching for ${dogCount} dogs...`);
    const results = await processDogMatching(userPreferences as UserPreferences, dogs as Dog[]);
    const matchingDuration = Date.now() - matchingStartTime;
    console.log(`[${requestId}] ✅ processDogMatching completed in ${matchingDuration}ms`);
    
    // Validate results
    const validation = validateMatchingResults(results, userPreferences, dogs);
    
    if (!validation.isValid) {
      console.warn('⚠️ API: Validation issues found:', validation.issues);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ API: Validation warnings:', validation.warnings);
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] ⏱️ /api/match-dogs total: ${totalDuration}ms`, {
      parseDuration: `${parseDuration}ms`,
      matchingDuration: `${matchingDuration}ms`,
      dogCount,
      hasGuidance,
      topMatches: results.topMatches.length,
      allMatches: results.allMatches.length
    });
    
    // Return results with validation info
    const responseHeaders = new Headers();
    responseHeaders.set('X-Request-ID', requestId);
    responseHeaders.set('X-Total-Duration', `${totalDuration}`);
    responseHeaders.set('X-Matching-Duration', `${matchingDuration}`);
    
    return NextResponse.json({
      success: true,
      results,
      validation: {
        isValid: validation.isValid,
        issues: validation.issues,
        warnings: validation.warnings
      },
      metadata: {
        totalDogs: dogs.length,
        topMatches: results.topMatches.length,
        allMatches: results.allMatches.length,
        expansionNotes: results.expansionNotes.length
      }
    }, { headers: responseHeaders });
    
  } catch (error) {
    console.error('❌ API: Dog matching error:', error);
    
    // Return structured error response
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'match-dogs',
    version: '2.0.0',
    description: 'AI-powered dog matching with deterministic scoring and LLM explanations'
  });
}

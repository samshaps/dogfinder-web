import { NextRequest, NextResponse } from 'next/server';
import { processDogMatching, validateMatchingResults } from '@/lib/matching-flow';
import { UserPreferences, Dog } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  console.log('🎯 Match-dogs API POST endpoint called');
  
  try {
    console.log('📥 Parsing request body...');
    const body = await request.json();
    console.log('📝 Request body keys:', Object.keys(body));
    
    const { userPreferences, dogs } = body;
    
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
    console.log('🔄 Calling processDogMatching...');
    const results = await processDogMatching(userPreferences as UserPreferences, dogs as Dog[]);
    console.log('✅ processDogMatching completed');
    
    // Validate results
    const validation = validateMatchingResults(results, userPreferences, dogs);
    
    if (!validation.isValid) {
      console.warn('⚠️ API: Validation issues found:', validation.issues);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ API: Validation warnings:', validation.warnings);
    }
    
    // Return results with validation info
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
    });
    
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

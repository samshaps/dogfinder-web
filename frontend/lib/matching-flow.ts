import { 
  UserPreferences, 
  Dog, 
  EffectivePreferences, 
  DogAnalysis, 
  MatchingResults,
  validateUserPreferences 
} from './schemas';
import { normalizeUserPreferences } from './normalization';
import { applyFilters } from './filtering';
import { scoreDog, getTopMatches, sortDogsByScore } from './scoring';
import { generateTop3Reasoning, generateAllMatchesReasoning } from './explanation';
import { getExpansionNotes } from './normalization';
import { isFeatureEnabled } from './featureFlags';
import { getInferredTraitsBatch } from './inference/trait-storage';
import { COPY_MAX } from './constants/copyLimits';

/**
 * Main Matching Flow
 * Orchestrates the entire AI matching pipeline
 */

/**
 * Main matching function that processes user preferences and returns ranked results
 */
export async function processDogMatching(
  userPreferences: UserPreferences,
  dogs: Dog[]
): Promise<MatchingResults> {
  console.log('🎯 Starting dog matching process for', dogs.length, 'dogs');
  
  try {
    // Step 1: Validate input
    console.log('📝 Step 1: Validating input...');
    const validatedPrefs = validateUserPreferences(userPreferences);
    console.log('✅ Step 1 completed: Validated preferences');
    
    // Step 2: Normalize preferences
    console.log('📝 Step 2: Normalizing preferences...');
    const effectivePrefs = normalizeUserPreferences(validatedPrefs);
    console.log('✅ Step 2 completed: Normalized preferences');
    
    // Step 3: Apply filters
    console.log('📝 Step 3: Applying filters...');
    const filteredDogs = applyFilters(dogs, effectivePrefs);
    console.log('✅ Step 3 completed: Filtered dogs:', filteredDogs.length, 'out of', dogs.length);
  
  if (filteredDogs.length === 0) {
    return {
      topMatches: [],
      allMatches: [],
      expansionNotes: getExpansionNotes(effectivePrefs)
    };
  }
  
  // Step 4: Load inferred traits if feature flag is enabled (V2)
  let inferredTraitsMap = new Map<string, any>();
  if (isFeatureEnabled('match_use_inferred_traits')) {
    console.log('🔍 Loading inferred traits for', filteredDogs.length, 'dogs...');
    const petfinderIds = filteredDogs.map(dog => dog.id);
    inferredTraitsMap = await getInferredTraitsBatch(petfinderIds);
    console.log('✅ Loaded inferred traits for', inferredTraitsMap.size, 'dogs');
  }
  
  // Step 5: Score all filtered dogs
  const analyses = filteredDogs.map(dog => {
    const inferredTraits = inferredTraitsMap.get(dog.id);
    return scoreDog(dog, effectivePrefs, inferredTraits);
  });
  console.log('📊 Scored', analyses.length, 'dogs');
  
  // Analytics: Track bonus distribution
  if (isFeatureEnabled('match_use_inferred_traits')) {
    const dogsWithBonuses = analyses.filter(a => (a.inferredBonusTotal || 0) > 0);
    const totalBonus = analyses.reduce((sum, a) => sum + (a.inferredBonusTotal || 0), 0);
    const avgBonus = dogsWithBonuses.length > 0 ? totalBonus / dogsWithBonuses.length : 0;
    const maxBonus = Math.max(...analyses.map(a => a.inferredBonusTotal || 0), 0);
    
    console.log('📈 Inferred trait bonuses:', {
      dogsWithBonuses: dogsWithBonuses.length,
      totalBonus: totalBonus.toFixed(2),
      avgBonus: avgBonus.toFixed(2),
      maxBonus: maxBonus.toFixed(2)
    });
  }
  
  // Step 6: Sort by score and distance
  const { dogs: sortedDogs, analyses: sortedAnalyses } = sortDogsByScore(filteredDogs, analyses);
  
  // Step 7: Get top matches (max 3)
  const topMatches = sortedAnalyses.slice(0, 3);
  const topDogs = sortedDogs.slice(0, 3);
  
  // Step 8: Generate AI explanations for top matches
  console.log('🤖 Generating AI explanations for top matches...');
  const topMatchesWithReasons = await Promise.all(
    topMatches.map(async (analysis, index) => {
      const dog = topDogs[index];
      try {
        const reasoning = await generateTop3Reasoning(dog, analysis, effectivePrefs);
        return {
          ...analysis,
          reasons: {
            primary150: reasoning.primary
          }
        };
      } catch (error) {
        console.warn('Failed to generate reasoning for', dog.name, error);
        return {
          ...analysis,
          reasons: {
            primary150: `${dog.name} is a great match based on your preferences.`
          }
        };
      }
    })
  );
  
  // Step 9: No AI explanations for all matches
  console.log('🛑 Skipping AI explanations for all matches.');
  const allMatchesWithReasons = sortedAnalyses.map((analysis) => ({
    ...analysis,
    reasons: { blurb50: '' }
  }));
  
    // Step 10: Compile results
    const results: MatchingResults = {
      topMatches: topMatchesWithReasons,
      allMatches: allMatchesWithReasons,
      expansionNotes: getExpansionNotes(effectivePrefs)
    };
    
    console.log('✅ Matching process complete:', {
      totalDogs: dogs.length,
      filteredDogs: filteredDogs.length,
      topMatches: results.topMatches.length,
      allMatches: results.allMatches.length,
      expansionNotes: results.expansionNotes.length
    });
    
    return results;
  } catch (error) {
    console.error('❌ Matching process failed:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return empty results on error
    return {
      topMatches: [],
      allMatches: [],
      expansionNotes: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Simplified matching function for testing/debugging
 */
export function processDogMatchingSync(
  userPreferences: UserPreferences,
  dogs: Dog[]
): Omit<MatchingResults, 'reasons'> {
  const validatedPrefs = validateUserPreferences(userPreferences);
  const effectivePrefs = normalizeUserPreferences(validatedPrefs);
  const filteredDogs = applyFilters(dogs, effectivePrefs);
  
  if (filteredDogs.length === 0) {
    return {
      topMatches: [],
      allMatches: [],
      expansionNotes: getExpansionNotes(effectivePrefs)
    };
  }
  
  // Note: Sync version doesn't load inferred traits (for testing only)
  const analyses = filteredDogs.map(dog => scoreDog(dog, effectivePrefs));
  const { dogs: sortedDogs, analyses: sortedAnalyses } = sortDogsByScore(filteredDogs, analyses);
  
  return {
    topMatches: sortedAnalyses.slice(0, 3),
    allMatches: sortedAnalyses,
    expansionNotes: getExpansionNotes(effectivePrefs)
  };
}

/**
 * Get matching summary for debugging
 */
export function getMatchingSummary(
  userPreferences: UserPreferences,
  dogs: Dog[]
): {
  input: {
    totalDogs: number;
    preferences: UserPreferences;
  };
  normalized: EffectivePreferences;
  filtered: {
    count: number;
    percentage: number;
  };
  expansion: {
    notes: string[];
    count: number;
  };
} {
  const validatedPrefs = validateUserPreferences(userPreferences);
  const effectivePrefs = normalizeUserPreferences(validatedPrefs);
  const filteredDogs = applyFilters(dogs, effectivePrefs);
  const expansionNotes = getExpansionNotes(effectivePrefs);
  
  return {
    input: {
      totalDogs: dogs.length,
      preferences: validatedPrefs
    },
    normalized: effectivePrefs,
    filtered: {
      count: filteredDogs.length,
      percentage: dogs.length > 0 ? Math.round((filteredDogs.length / dogs.length) * 100) : 0
    },
    expansion: {
      notes: expansionNotes,
      count: expansionNotes.length
    }
  };
}

/**
 * Validate that results meet acceptance criteria
 */
export function validateMatchingResults(
  results: MatchingResults,
  userPreferences: UserPreferences,
  originalDogs: Dog[]
): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check top matches count
  if (results.topMatches.length > 3) {
    issues.push('Top matches exceed limit of 3');
  }
  
  // Check copy length constraints
  results.topMatches.forEach((match, index) => {
    if (match.reasons.primary150 && match.reasons.primary150.length > COPY_MAX.TOP) {
      issues.push(`Top match ${index + 1} primary reason exceeds ${COPY_MAX.TOP} characters`);
    }
  });
  
  results.allMatches.forEach((match, index) => {
    if (match.reasons.blurb50 && match.reasons.blurb50.length > 50) {
      issues.push(`All match ${index + 1} blurb exceeds 50 characters`);
    }
  });
  
  // Check ZIP filtering
  if (userPreferences.zipCodes && userPreferences.radiusMi) {
    const invalidDistance = results.allMatches.some(match => {
      const dog = originalDogs.find(d => d.id === match.dogId);
      return dog && dog.location.distanceMi && dog.location.distanceMi > userPreferences.radiusMi;
    });
    
    if (invalidDistance) {
      issues.push('Some dogs exceed radius limit');
    }
  }
  
  // Check breed filtering
  if (userPreferences.breedsExclude && userPreferences.breedsExclude.length > 0) {
    const excludedBreeds = results.allMatches.some(match => {
      const dog = originalDogs.find(d => d.id === match.dogId);
      return dog && userPreferences.breedsExclude!.some((exclude: string) => 
        dog.breeds.some(breed => breed.toLowerCase().includes(exclude.toLowerCase()))
      );
    });
    
    if (excludedBreeds) {
      issues.push('Some dogs have excluded breeds');
    }
  }
  
  // Check deterministic ranking
  for (let i = 1; i < results.allMatches.length; i++) {
    const prev = results.allMatches[i - 1];
    const curr = results.allMatches[i];
    
    if (prev.score < curr.score) {
      issues.push('Results not properly sorted by score');
      break;
    }
    
    if (prev.score === curr.score) {
      // Check distance tie-break
      const prevDog = originalDogs.find(d => d.id === prev.dogId);
      const currDog = originalDogs.find(d => d.id === curr.dogId);
      
      if (prevDog && currDog && 
          prevDog.location.distanceMi && currDog.location.distanceMi &&
          prevDog.location.distanceMi > currDog.location.distanceMi) {
        issues.push('Distance tie-break not properly applied');
        break;
      }
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

import { Dog, EffectivePreferences } from './schemas';
import { dogBreedHit } from '@/utils/breedFuzzy';

/**
 * Filtering Layer
 * Handles zip/radius filtering and breed inclusion/exclusion logic
 */

/**
 * Filter dogs by radius using distanceMi if available, otherwise compute via zip codes
 */
export function filterByRadius(
  dogs: Dog[], 
  zipCodes: string[], 
  radiusMi: number
): Dog[] {
  // If no zip filter is provided, do not apply radius filtering
  if (!zipCodes || zipCodes.length === 0) return dogs;
  return dogs.filter(dog => {
    // If distanceMi is already computed and available, use it
    if (dog.location.distanceMi !== undefined) {
      return dog.location.distanceMi <= radiusMi;
    }
    
    // Otherwise, we would need to compute distance via zip codes
    // For now, include all dogs if distanceMi is not available
    // TODO: Implement Haversine distance calculation if needed
    return true;
  });
}

/**
 * Filter dogs by breed inclusion/exclusion logic
 */
export function filterByBreeds(dogs: Dog[], effectivePrefs: EffectivePreferences): Dog[] {
  const { breeds } = effectivePrefs;
  
  return dogs.filter(dog => {
    // First, check exclusions (exclude takes precedence)
    if (breeds.expandedExclude.length > 0) {
      const ex = dogBreedHit(dog, breeds.expandedExclude);
      const isExcluded = ex.hit;
      if (isExcluded) {
        return false;
      }
    }
    
    // Then, check inclusions (if any include terms exist)
    if (breeds.expandedInclude.length > 0) {
      const inc = dogBreedHit(dog, breeds.expandedInclude);
      return inc.hit;
    }
    
    // If no include breeds specified, don't filter by include
    return true;
  });
}

/**
 * Apply all filters to a dog list
 */
export function applyFilters(
  dogs: Dog[], 
  effectivePrefs: EffectivePreferences
): Dog[] {
  let filteredDogs = dogs;
  
  // Filter by radius first
  filteredDogs = filterByRadius(
    filteredDogs, 
    effectivePrefs.zipCodes, 
    effectivePrefs.radiusMi
  );
  
  // Then filter by breeds
  filteredDogs = filterByBreeds(filteredDogs, effectivePrefs);
  
  return filteredDogs;
}

/**
 * Check if a dog passes the breed filters
 */
export function passesBreedFilter(dog: Dog, effectivePrefs: EffectivePreferences): boolean {
  const { breeds } = effectivePrefs;
  
  // Check exclusions first
  if (breeds.expandedExclude.length > 0) {
    const ex = dogBreedHit(dog, breeds.expandedExclude);
    if (ex.hit) {
      return false;
    }
  }
  
  // Check inclusions if any exist
  if (breeds.expandedInclude.length > 0) {
    const inc = dogBreedHit(dog, breeds.expandedInclude);
    return inc.hit;
  }
  
  // If no include breeds specified, pass the filter
  return true;
}

/**
 * Check if a dog passes the radius filter
 */
export function passesRadiusFilter(dog: Dog, radiusMi: number): boolean {
  if (dog.location.distanceMi !== undefined) {
    return dog.location.distanceMi <= radiusMi;
  }
  
  // If distanceMi is not available, assume it passes
  // TODO: Implement proper distance calculation if needed
  return true;
}

/**
 * Get filter summary for debugging
 */
export function getFilterSummary(
  originalCount: number, 
  filteredCount: number, 
  effectivePrefs: EffectivePreferences
): {
  totalDogs: number;
  filteredDogs: number;
  filters: {
    radius: { applied: boolean; radiusMi: number };
    breeds: { 
      applied: boolean; 
      includeCount: number; 
      excludeCount: number;
      notes: string[];
    };
  };
} {
  return {
    totalDogs: originalCount,
    filteredDogs: filteredCount,
    filters: {
      radius: {
        applied: true,
        radiusMi: effectivePrefs.radiusMi
      },
      breeds: {
        applied: effectivePrefs.breeds.expandedInclude.length > 0 || effectivePrefs.breeds.expandedExclude.length > 0,
        includeCount: effectivePrefs.breeds.expandedInclude.length,
        excludeCount: effectivePrefs.breeds.expandedExclude.length,
        notes: effectivePrefs.breeds.notes
      }
    }
  };
}

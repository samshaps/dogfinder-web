import { Dog, EffectivePreferences, DogAnalysis } from './schemas';
import { dogBreedHit } from '@/utils/breedFuzzy';
import { getMultiBreedTemperaments, TemperamentTrait } from './breedTemperaments';

/**
 * Scoring Layer
 * Deterministic scoring with weighted preferences based on origin (user > guidance > default)
 */

/**
 * Derive features from dog data for scoring
 */
function deriveDogFeatures(dog: Dog) {
  const breeds = dog.breeds.map(b => b.toLowerCase());
  
  // Basic breed facts for scoring
  const breedFacts = {
    shedHigh: breeds.some(b => 
      ['labrador retriever', 'golden retriever', 'german shepherd', 'husky', 'siberian husky'].includes(b)
    ),
    groomingHigh: breeds.some(b => 
      ['poodle', 'bichon frise', 'maltese', 'shih tzu', 'yorkshire terrier'].includes(b)
    ),
    energyHigh: breeds.some(b => 
      ['border collie', 'australian shepherd', 'jack russell terrier', 'beagle'].includes(b)
    ),
    barky: breeds.some(b => 
      ['beagle', 'jack russell terrier', 'chihuahua', 'miniature pinscher'].includes(b)
    ),
    hypoallergenic: breeds.some(b => 
      ['poodle', 'bichon frise', 'maltese', 'shih tzu', 'yorkshire terrier', 'portuguese water dog'].includes(b)
    )
  };
  
  // Age-based features
  const isPuppy = /baby|puppy/i.test(dog.age);
  const isYoung = /young/i.test(dog.age);
  const isAdult = /adult/i.test(dog.age);
  const isSenior = /senior/i.test(dog.age);
  
  // Size normalization
  const sizeNormalized = dog.size.toLowerCase().replace(/extra\s+large|xl/i, 'xl');
  
  return {
    ...breedFacts,
    isPuppy,
    isYoung,
    isAdult,
    isSenior,
    sizeNormalized,
    // Use dog's own properties if available
    shedLevel: dog.shedLevel || (breedFacts.shedHigh ? 'high' : 'med'),
    groomingLoad: dog.groomingLoad || (breedFacts.groomingHigh ? 'high' : 'med'),
    energy: dog.energy || (breedFacts.energyHigh ? 'high' : 'med'),
    barky: dog.barky ?? breedFacts.barky,
    hypoallergenic: dog.hypoallergenic ?? breedFacts.hypoallergenic
  };
}

/**
 * Get scoring weight based on origin
 */
function getScoringWeight(origin: "user" | "guidance" | "default"): number {
  switch (origin) {
    case "user": return 1.0;
    case "guidance": return 0.7;
    case "default": return 0.5;
    default: return 0.5;
  }
}

/**
 * Score a dog against effective preferences
 */
export function scoreDog(dog: Dog, effectivePrefs: EffectivePreferences): DogAnalysis {
  const features = deriveDogFeatures(dog);
  let score = 100;
  const matchedPrefs: string[] = [];
  const unmetPrefs: string[] = [];
  
  // Age scoring (OR logic for multiple selections)
  if (effectivePrefs.age.value.length > 0) {
    const dogAgeLower = dog.age.toLowerCase();
    const userAgesLower = effectivePrefs.age.value.map(a => a.toLowerCase());
    const ageMatch = userAgesLower.includes(dogAgeLower);
    
    const weight = getScoringWeight(effectivePrefs.age.origin);
    
    if (ageMatch) {
      score += Math.round(10 * weight);
      matchedPrefs.push(`${dog.age} age`);
    } else {
      score -= Math.round(15 * weight);
      unmetPrefs.push(`Age: ${dog.age} (wanted ${effectivePrefs.age.value.join(' or ')})`);
    }
  }
  
  // Size scoring (OR logic for multiple selections)
  if (effectivePrefs.size.value.length > 0) {
    const dogSizeLower = features.sizeNormalized;
    const userSizesLower = effectivePrefs.size.value.map(s => s.toLowerCase());
    const sizeMatch = userSizesLower.includes(dogSizeLower);
    
    const weight = getScoringWeight(effectivePrefs.size.origin);
    
    if (sizeMatch) {
      score += Math.round(10 * weight);
      matchedPrefs.push(`${dog.size} size`);
    } else {
      score -= Math.round(15 * weight);
      unmetPrefs.push(`Size: ${dog.size} (wanted ${effectivePrefs.size.value.join(' or ')})`);
    }
  }
  
  // Energy scoring
  if (effectivePrefs.energy) {
    const dogEnergy = features.energy.toLowerCase();
    const userEnergy = effectivePrefs.energy.value.toLowerCase();
    const energyMatch = dogEnergy === userEnergy;
    
    const weight = getScoringWeight(effectivePrefs.energy.origin);
    
    if (energyMatch) {
      score += Math.round(10 * weight);
      matchedPrefs.push(`${dogEnergy} energy`);
    } else {
      score -= Math.round(20 * weight);
      unmetPrefs.push(`Energy: ${dogEnergy} (wanted ${userEnergy})`);
    }
  }
  
  // Breed scoring with tiers (precision > recall)
  if (effectivePrefs.breeds.expandedInclude.length > 0) {
    const bh = dogBreedHit(dog, effectivePrefs.breeds.expandedInclude);
    const weight = getScoringWeight(effectivePrefs.breeds.origin);
    if (bh.hit) {
      // Tier bonuses: exact > alias > family > phonetic/edit > ngram
      const tier = bh.tier || 5;
      const tierBonus = ({1: 22, 2: 18, 3: 14, 4: 10, 5: 6} as Record<number, number>)[tier] || 6;
      score += Math.round(tierBonus * weight);
      matchedPrefs.push('preferred breed');
    } else {
      score -= Math.round(25 * weight);
      unmetPrefs.push('Breed: not in preferred breeds');
    }
  }
  
  // Temperament scoring (blended: 60% dog evidence + 40% breed prior)
  if (effectivePrefs.temperament.value.length > 0) {
    const tempMatches: string[] = [];
    const tempUnmet: string[] = [];
    const breedTemperaments = getMultiBreedTemperaments(dog.breeds);
    
    for (const wantTemp of effectivePrefs.temperament.value as TemperamentTrait[]) {
      // Check for explicit dog evidence first
      const dogEvidence = dog.temperament?.includes(wantTemp) ? 1 : 0;
      
      // Get breed prior (0-3 scale, normalize to 0-1)
      const breedPrior = (breedTemperaments[wantTemp] || 0) / 3;
      
      // Blend: 60% dog evidence + 40% breed prior
      const blendedScore = (0.6 * dogEvidence) + (0.4 * breedPrior);
      
      // Consider it a match if blended score >= 0.5
      if (blendedScore >= 0.5) {
        tempMatches.push(wantTemp);
      } else {
        tempUnmet.push(wantTemp);
      }
    }
    
    const weight = getScoringWeight(effectivePrefs.temperament.origin);
    
    if (tempMatches.length > 0) {
      score += Math.round(10 * weight * tempMatches.length);
      matchedPrefs.push(...tempMatches);
    }
    
    if (tempUnmet.length > 0) {
      score -= Math.round(15 * weight * tempUnmet.length);
      unmetPrefs.push(...tempUnmet.map(t => `Temperament: ${t}`));
    }
  }
  
  // Flag-based penalties and bonuses
  const { flags } = effectivePrefs;
  
  // Low maintenance penalties
  if (flags.lowMaintenance) {
    if (features.isPuppy) {
      score -= 15;
      unmetPrefs.push('Not low-maintenance: puppy requires training');
    }
    if (features.groomingLoad === 'high') {
      score -= 10;
      unmetPrefs.push('Not low-maintenance: high grooming needs');
    }
    if (features.energy === 'high') {
      score -= 10;
      unmetPrefs.push('Not low-maintenance: high energy');
    }
  }
  
  // Quiet preference vs barky
  if (flags.quietPreferred && features.barky) {
    score -= 15;
    unmetPrefs.push('Not quiet: tends to bark');
  }
  
  // Apartment suitability
  if (flags.apartmentOk && dog.size === 'xl') {
    score -= 10;
    unmetPrefs.push('Size: XL may be too large for apartment');
  }
  
  // Clamp score to 0+ range (allow bonuses above 100)
  score = Math.max(0, score);
  
  return {
    dogId: dog.id,
    score,
    matchedPrefs,
    unmetPrefs,
    reasons: {} // Will be filled by explanation layer
  };
}

/**
 * Sort dogs by score (highest first), then by distance (closest first)
 */
export function sortDogsByScore(dogs: Dog[], analyses: DogAnalysis[]): { dogs: Dog[]; analyses: DogAnalysis[] } {
  const combined = dogs.map((dog, index) => ({
    dog,
    analysis: analyses[index]
  }));
  
  combined.sort((a, b) => {
    // Primary sort: score (highest first)
    if (b.analysis.score !== a.analysis.score) {
      return b.analysis.score - a.analysis.score;
    }
    // Secondary: stronger explicit facet matches win (age/size/temperament count)
    const aFacets = (a.analysis.matchedPrefs || []).length;
    const bFacets = (b.analysis.matchedPrefs || []).length;
    if (bFacets !== aFacets) return bFacets - aFacets;
    // Tertiary: distance (closest first)
    const aDistance = a.dog.location.distanceMi || Infinity;
    const bDistance = b.dog.location.distanceMi || Infinity;
    return aDistance - bDistance;
  });
  
  return {
    dogs: combined.map(c => c.dog),
    analyses: combined.map(c => c.analysis)
  };
}

/**
 * Get top matches (up to maxCount)
 */
export function getTopMatches(
  dogs: Dog[], 
  analyses: DogAnalysis[], 
  maxCount: number = 3
): { dogs: Dog[]; analyses: DogAnalysis[] } {
  const { dogs: sortedDogs, analyses: sortedAnalyses } = sortDogsByScore(dogs, analyses);
  
  return {
    dogs: sortedDogs.slice(0, maxCount),
    analyses: sortedAnalyses.slice(0, maxCount)
  };
}

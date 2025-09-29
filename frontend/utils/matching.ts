// Deterministic dog matching and scoring utilities

export interface Dog {
  id: string;
  name: string;
  breeds: string[];
  age: string;
  size: string;
  gender: string;
  photos: string[];
  publishedAt: string;
  location: {
    city: string;
    state: string;
    distanceMi: number;
  };
  tags: string[];
  url: string;
  shelter: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface UserPreferences {
  age?: string[];
  size?: string[];
  includeBreeds?: string[];
  excludeBreeds?: string[];
  temperament?: string[];
  energy?: string;
  guidance?: string;
}

export type BreedFacts = {
  shed: "low"|"med"|"high";
  grooming: "low"|"med"|"high";
  typicalEnergy: "low"|"med"|"high";
  barky?: boolean;
  hypoallergenic?: boolean;
};

export const BREED_FACTS: Record<string, BreedFacts> = {
  "poodle": { shed:"low", grooming:"high", typicalEnergy:"med", hypoallergenic:true },
  "bichon frise": { shed:"low", grooming:"high", typicalEnergy:"med", hypoallergenic:true },
  "maltese": { shed:"low", grooming:"high", typicalEnergy:"low", hypoallergenic:true },
  "shih tzu": { shed:"low", grooming:"high", typicalEnergy:"low", hypoallergenic:true },
  "yorkshire terrier": { shed:"low", grooming:"high", typicalEnergy:"med", hypoallergenic:true },
  "portuguese water dog": { shed:"low", grooming:"high", typicalEnergy:"high", hypoallergenic:true },
  "schnauzer": { shed:"low", grooming:"high", typicalEnergy:"med", hypoallergenic:true },
  "havanese": { shed:"low", grooming:"high", typicalEnergy:"med", hypoallergenic:true },
  "coton de tulear": { shed:"low", grooming:"high", typicalEnergy:"med", hypoallergenic:true },
  "lagotto romagnolo": { shed:"low", grooming:"high", typicalEnergy:"med", hypoallergenic:true },
  "soft coated wheaten terrier": { shed:"low", grooming:"med", typicalEnergy:"med", hypoallergenic:true },
  
  "labrador retriever": { shed:"high", grooming:"med", typicalEnergy:"high" },
  "golden retriever": { shed:"high", grooming:"med", typicalEnergy:"high" },
  "german shepherd": { shed:"high", grooming:"med", typicalEnergy:"high" },
  "great pyrenees": { shed:"high", grooming:"high", typicalEnergy:"med" },
  "husky": { shed:"high", grooming:"med", typicalEnergy:"high" },
  "siberian husky": { shed:"high", grooming:"med", typicalEnergy:"high" },
  "alaskan malamute": { shed:"high", grooming:"med", typicalEnergy:"high" },
  "bernese mountain dog": { shed:"high", grooming:"high", typicalEnergy:"med" },
  "newfoundland": { shed:"high", grooming:"high", typicalEnergy:"med" },
  "saint bernard": { shed:"high", grooming:"high", typicalEnergy:"med" },
  "akita": { shed:"high", grooming:"med", typicalEnergy:"med" },
  "chow chow": { shed:"high", grooming:"high", typicalEnergy:"low" },
  "pomeranian": { shed:"high", grooming:"high", typicalEnergy:"med" },
  "collie": { shed:"high", grooming:"med", typicalEnergy:"med" },
  "shetland sheepdog": { shed:"high", grooming:"med", typicalEnergy:"med" },
  "australian shepherd": { shed:"high", grooming:"med", typicalEnergy:"high" },
  "border collie": { shed:"high", grooming:"med", typicalEnergy:"high" },
  
  "beagle": { shed:"med", grooming:"low", typicalEnergy:"med", barky:true },
  "rat terrier": { shed:"med", grooming:"low", typicalEnergy:"high", barky:true },
  "jack russell terrier": { shed:"med", grooming:"low", typicalEnergy:"high", barky:true },
  "fox terrier": { shed:"med", grooming:"low", typicalEnergy:"high", barky:true },
  "cairn terrier": { shed:"med", grooming:"low", typicalEnergy:"med", barky:true },
  "west highland terrier": { shed:"med", grooming:"low", typicalEnergy:"med", barky:true },
  "scottish terrier": { shed:"med", grooming:"low", typicalEnergy:"med", barky:true },
  "dachshund": { shed:"med", grooming:"low", typicalEnergy:"med", barky:true },
  "chihuahua": { shed:"med", grooming:"low", typicalEnergy:"med", barky:true },
  "miniature pinscher": { shed:"med", grooming:"low", typicalEnergy:"med", barky:true },
  
  "bulldog": { shed:"med", grooming:"low", typicalEnergy:"low" },
  "french bulldog": { shed:"med", grooming:"low", typicalEnergy:"low" },
  "boston terrier": { shed:"med", grooming:"low", typicalEnergy:"med" },
  "boxer": { shed:"med", grooming:"low", typicalEnergy:"high" },
  "rottweiler": { shed:"med", grooming:"low", typicalEnergy:"med" },
  "doberman pinscher": { shed:"med", grooming:"low", typicalEnergy:"high" },
  "mastiff": { shed:"med", grooming:"low", typicalEnergy:"low" },
  "great dane": { shed:"med", grooming:"low", typicalEnergy:"med" },
  "greyhound": { shed:"med", grooming:"low", typicalEnergy:"low" },
  "whippet": { shed:"med", grooming:"low", typicalEnergy:"med" },
  "italian greyhound": { shed:"med", grooming:"low", typicalEnergy:"med" },
};

export function deriveFeatures(dog: Dog) {
  const breeds = dog.breeds.map(b => b.toLowerCase());
  const facts = breeds.map(b => BREED_FACTS[b]).filter(Boolean);
  const any = <K extends keyof BreedFacts>(k: K, v: any) => facts.some(f => f?.[k] === v);
  const hasTag = (s: string) => dog.tags.some(t => t.toLowerCase().includes(s));

  const isPuppy = /baby|puppy/i.test(dog.age);
  return {
    isPuppy,
    shedHigh: any("shed","high"),
    groomingHigh: any("grooming","high"),
    energyHigh: any("typicalEnergy","high") || hasTag("high energy") || hasTag("energetic"),
    barky: any("barky", true) || hasTag("bark") || hasTag("vocal") || hasTag("talkative"),
    hypoClaim: any("hypoallergenic", true) || hasTag("hypoallergenic"),
  };
}

export type PrefHit = { key: "age"|"size"|"breeds"|"energy"|"temperament"; label: string; origin?: "user"|"guidance"|"default" };

export type Analysis = {
  score: number;
  matches: string[];      // generic matches (from facts/tags)
  mismatches: string[];   // generic mismatches
  matchedPrefs: PrefHit[]; // explicit hits vs user prefs
  unmetPrefs: PrefHit[];   // explicit misses vs user prefs
  expansions?: string[];   // human-readable notes from guidance expansion
};

import { tokenizeGuidance } from "@/utils/guidance";

export type EffectivePrefs = UserPreferences & {
  expansionNotes?: string[];
  _origin?: {
    ageUser: Set<string>;
    ageGuidance: Set<string>;
    sizeUser: Set<string>;
    sizeGuidance: Set<string>;
    tempUser: Set<string>;
    tempGuidance: Set<string>;
    energyUser: boolean;
    energyGuidance: boolean;
  };
};

export function mergeGuidanceIntoPrefs(prefs: UserPreferences): EffectivePrefs {
  const g = tokenizeGuidance(prefs.guidance);
  const notes: string[] = [];

  const normArr = (xs?: string[]) => (xs || []).map(x => x?.toLowerCase()?.trim()).filter(Boolean);

  // AGE
  const ageFromG: string[] = [];
  if (g.age.puppy) ageFromG.push("puppy");
  if (g.age.young) ageFromG.push("young");
  if (g.age.adult) ageFromG.push("adult");
  if (g.age.senior) ageFromG.push("senior");
  const ageUser = new Set(normArr(prefs.age));
  const age = new Set(ageUser);
  const ageGuidance = new Set<string>();
  ageFromG.forEach(a => { if (a && !age.has(a)) { age.add(a); ageGuidance.add(a); notes.push(`Expanded age with guidance: +${a}`); } });

  // SIZE
  const sizeFromG: string[] = [];
  if (g.size.small) sizeFromG.push("small");
  if (g.size.medium) sizeFromG.push("medium");
  if (g.size.large) sizeFromG.push("large");
  const sizeUser = new Set(normArr(prefs.size));
  const size = new Set(sizeUser);
  const sizeGuidance = new Set<string>();
  sizeFromG.forEach(s => { if (s && !size.has(s)) { size.add(s); sizeGuidance.add(s); notes.push(`Expanded size with guidance: +${s}`); } });

  // ENERGY
  const energyFromG = (g.energy.high || g.energy.active) ? "high"
                     : (g.energy.low || g.energy.lowMaint) ? "low"
                     : g.energy.medium ? "medium" : undefined;
  let energy = prefs.energy?.toLowerCase()?.trim();
  let energyUser = Boolean(energy);
  let energyGuidance = false;
  if (!energy && energyFromG) {
    energy = energyFromG;
    notes.push(`Set energy from guidance: ${energyFromG}`);
    energyGuidance = true;
  } else if (energy && energyFromG && energy !== energyFromG) {
    notes.push(`Allowing energy "${energyFromG}" via guidance in addition to selected "${energy}"`);
  }

  // TEMPERAMENT
  const tempUser = new Set(normArr(prefs.temperament));
  const tempSet = new Set(tempUser);
  const tempGuidance = new Set<string>();
  if (g.temperament.hypoallergenic && !tempSet.has("hypoallergenic")) { tempSet.add("hypoallergenic"); tempGuidance.add("hypoallergenic"); notes.push("Expanded temperament: +hypoallergenic"); }
  if (g.temperament.quiet && !tempSet.has("quiet")) { tempSet.add("quiet"); tempGuidance.add("quiet"); notes.push("Expanded temperament: +quiet"); }
  if (g.temperament.goodWithKids && !tempSet.has("good with kids")) { tempSet.add("good with kids"); tempGuidance.add("good with kids"); notes.push("Expanded temperament: +good with kids"); }

  return {
    ...prefs,
    age: Array.from(age),
    size: Array.from(size),
    energy: energy,
    temperament: Array.from(tempSet),
    expansionNotes: notes,
    _origin: {
      ageUser,
      ageGuidance,
      sizeUser,
      sizeGuidance,
      tempUser,
      tempGuidance,
      energyUser,
      energyGuidance,
    }
  };
}

export function buildAnalysis(dog: Dog, prefs: UserPreferences): Analysis {
  const eff = mergeGuidanceIntoPrefs(prefs);
  const f = deriveFeatures(dog);
  let score = 100;
  const matches: string[] = [];
  const mismatches: string[] = [];
  const matchedPrefs: PrefHit[] = [];
  const unmetPrefs: PrefHit[] = [];

  // Age with guidance weighting (OR logic for multiple selections)
  if (eff.age?.length) {
    // Debug logging for age matching
    console.log('🔍 DEBUG (Matching): User age preferences:', eff.age);
    console.log('🔍 DEBUG (Matching): Dog age:', dog.age);
    console.log('🔍 DEBUG (Matching): Dog age type:', typeof dog.age);
    console.log('🔍 DEBUG (Matching): User age types:', eff.age.map(a => typeof a));
    
    // Case-insensitive matching
    const dogAgeLower = dog.age?.toLowerCase()?.trim();
    const userAgesLower = eff.age.map(a => a?.toLowerCase()?.trim());
    const ageMatch = userAgesLower.includes(dogAgeLower);
    
    console.log('🔍 DEBUG (Matching): Dog age (lowercase):', dogAgeLower);
    console.log('🔍 DEBUG (Matching): User ages (lowercase):', userAgesLower);
    console.log('🔍 DEBUG (Matching): Age match (case-insensitive):', ageMatch);
    
    const isGuidanceTrait = (eff.guidance || "").toLowerCase().includes("puppy") || (eff.guidance || "").toLowerCase().includes("adult");
    const weightMultiplier = isGuidanceTrait ? 2.5 : 1;
    
    if (ageMatch) {
      matches.push(`${dog.age} is within your preferences`);
      let origin: "user"|"guidance"|"default" = "default";
      if (eff._origin?.ageUser?.has(dogAgeLower!)) origin = "user";
      else if (eff._origin?.ageGuidance?.has(dogAgeLower!)) origin = "guidance";
      matchedPrefs.push({ key: "age", label: dog.age, origin });
      if (isGuidanceTrait) score += 10;
      console.log('✅ DEBUG (Matching): Age match found for', dog.age);
    } else {
      score -= Math.round(15 * weightMultiplier);
      mismatches.push(`Age ${dog.age} not in selected range (${eff.age.join(", ")})`);
      unmetPrefs.push({ key: "age", label: `not ${eff.age.join(" or ")}` });
      console.log('❌ DEBUG (Matching): Age mismatch for', dog.age, 'not in', eff.age);
    }
  }

  // Size with guidance weighting (OR logic for multiple selections)
  if (eff.size?.length) {
    // Case-insensitive matching (mirror age logic)
    const dogSizeLower = dog.size?.toLowerCase()?.trim();
    const userSizesLower = eff.size.map(s => s?.toLowerCase()?.trim());
    const sizeMatch = userSizesLower.includes(dogSizeLower);
    
    // Add "medium" to guidance weighting check
    const guidance = (eff.guidance || "").toLowerCase();
    const isGuidanceTrait = guidance.includes("apartment") || 
                           guidance.includes("small") || 
                           guidance.includes("medium") ||
                           guidance.includes("medium-sized") ||
                           guidance.includes("large");
    const weightMultiplier = isGuidanceTrait ? 2.5 : 1;
    
    if (sizeMatch) {
      matches.push(`${dog.size} is within your preferences`);
      let origin: "user"|"guidance"|"default" = "default";
      if (eff._origin?.sizeUser?.has(dogSizeLower!)) origin = "user";
      else if (eff._origin?.sizeGuidance?.has(dogSizeLower!)) origin = "guidance";
      matchedPrefs.push({ key: "size", label: `${dog.size} size fits your needs`, origin });
      if (isGuidanceTrait) {
        score += 10;
      }
    } else {
      score -= Math.round(15 * weightMultiplier);
      mismatches.push(`Size ${dog.size} not in selected range (${eff.size.join(", ")})`);
      unmetPrefs.push({ key: "size", label: `Dog is ${dog.size}; you selected ${eff.size.join(" or ")}` });
    }
  }

  // Include/Exclude breeds
  if (eff.excludeBreeds?.some(b => dog.breeds.some(db => db.toLowerCase().includes(b.toLowerCase())))) {
    return { 
      score: 0, 
      matches, 
      mismatches: ["Excluded breed"], 
      matchedPrefs, 
      unmetPrefs: [...unmetPrefs, { key: "breeds", label: dog.breeds.join(", ") }]
    };
  }
  if (eff.includeBreeds?.length) {
    const hit = eff.includeBreeds.some(b => dog.breeds.some(db => db.toLowerCase().includes(b.toLowerCase())));
    if (hit) {
      matches.push("Preferred breed");
      matchedPrefs.push({ key: "breeds", label: dog.breeds.join(", "), origin: "user" });
    } else {
      score -= 10;
      mismatches.push("Not in preferred breeds");
      unmetPrefs.push({ key: "breeds", label: dog.breeds.join(", ") });
    }
  }

  // Energy with guidance weighting
  if (eff.energy) {
    // Treat an explicit energy preference (from chips or normalized guidance) as critical
    const gtext = (eff.guidance || "").toLowerCase();
    const isGuidanceTrait = gtext.includes("active") || gtext.includes("low-maintenance") || gtext.includes("retired");
    const isEnergyCritical = true; // explicit eff.energy present → critical
    const weightMultiplier = (isGuidanceTrait || isEnergyCritical) ? 2.5 : 1;

    const want = eff.energy as ("low"|"medium"|"high");
    const tg = tokenizeGuidance(eff.guidance);
    const altFromGuidance = tg.energy.active || tg.energy.high ? "high" : (tg.energy.lowMaint || tg.energy.low ? "low" : (tg.energy.medium ? "medium" : undefined));
    const acceptable = new Set([want, altFromGuidance].filter(Boolean) as string[]);

    if (acceptable.size) {
      const dogIsHigh = f.energyHigh || /baby|puppy/i.test(dog.age);
      const dogIsLow = !f.energyHigh && !/baby|puppy/i.test(dog.age);
      const dogEnergy = dogIsHigh ? "high" : (dogIsLow ? "low" : "medium");

      if (acceptable.has(dogEnergy)) {
        let origin: "user"|"guidance"|"default" = "default";
        if (want && dogEnergy === want && eff._origin?.energyUser) origin = "user";
        else if (!want || (want && dogEnergy !== want)) origin = "guidance";
        matchedPrefs.push({ key: "energy", label: `Energy level matches (${dogEnergy})`, origin });
        matches.push(dogEnergy === "high" ? "Energy suitable for active lifestyle" : "Energy appropriate for home life");
        if (want && dogEnergy === want) score += 10;
      } else {
        mismatches.push(`Energy ${dogEnergy} vs selected (${Array.from(acceptable).join(" or ")})`);
        unmetPrefs.push({ key: "energy", label: `Dog energy is ${dogEnergy}; you allowed ${Array.from(acceptable).join(" or ")}` });
        // Stronger penalty when low energy requested but dog is high energy
        if (want === "low" && dogEnergy === "high") {
          score -= Math.round(40 * weightMultiplier);
        } else {
          score -= Math.round(20 * weightMultiplier);
        }
      }
    }
  }

  // Temperament tags with guidance weighting (OR logic for multiple selections)
  if (eff.temperament?.length) {
    const matchedTemperaments: string[] = [];
    const unmetTemperaments: string[] = [];
    
    for (const want of eff.temperament) {
      const has = dog.tags.some(t => t.toLowerCase().includes(want.toLowerCase()))
               || (want === "hypoallergenic" && f.hypoClaim);
      
      if (has) {
        matchedTemperaments.push(want);
      } else {
        unmetTemperaments.push(want);
      }
    }
    
    // If any temperament matches, it's a positive
    if (matchedTemperaments.length > 0) {
      matchedTemperaments.forEach(want => {
        let origin: "user"|"guidance"|"default" = "default";
        if (eff._origin?.tempUser?.has(want)) origin = "user";
        else if (eff._origin?.tempGuidance?.has(want)) origin = "guidance";
        matchedPrefs.push({ key: "temperament", label: want, origin });
        if (want === "hypoallergenic") matches.push("Hypoallergenic");
        
        // Weight guidance traits more heavily
        const isGuidanceTrait = want === "hypoallergenic" || want === "quiet" || want === "good with kids";
        if (isGuidanceTrait) score += 10;
      });
    }
    
    // Only penalize if NO temperament preferences are met
    if (matchedTemperaments.length === 0) {
      unmetTemperaments.forEach(want => {
        unmetPrefs.push({ key: "temperament", label: want });
        
        const isGuidanceTrait = want === "hypoallergenic" || want === "quiet" || want === "good with kids";
        const weightMultiplier = isGuidanceTrait ? 2.5 : 1;
        
        if (want === "hypoallergenic") {
          score -= Math.round(30 * weightMultiplier);
          mismatches.push("Not hypoallergenic");
          if (f.shedHigh) { score -= Math.round(30 * weightMultiplier); mismatches.push("Heavy shedding vs allergy concern"); }
        }
        if (want === "quiet" && f.barky) { score -= Math.round(15 * weightMultiplier); mismatches.push("Tends to be vocal"); }
      });
    }
  }

  // Guidance heuristics
  const g = (eff.guidance || "").toLowerCase();
  const wantsLowMaint = g.includes("low-maintenance") || g.includes("retired") || g.includes("first-time");
  if (wantsLowMaint && (f.isPuppy || f.groomingHigh || f.energyHigh)) {
    score -= 15;
    mismatches.push("Not low-maintenance (puppy/energy/grooming)");
  }

  // Contradiction guard: remove size mismatch if size match exists (and vice versa)
  const hasSizeMatch = matchedPrefs.some(p => p.key === "size");
  const hasSizeMismatch = unmetPrefs.some(p => p.key === "size");
  
  if (hasSizeMatch && hasSizeMismatch) {
    // Remove the mismatch since we have a match
    const sizeMismatchIndex = unmetPrefs.findIndex(p => p.key === "size");
    if (sizeMismatchIndex !== -1) {
      unmetPrefs.splice(sizeMismatchIndex, 1);
    }
    
    // Remove size mismatch from mismatches array
    const sizeMismatchStringIndex = mismatches.findIndex(m => m.startsWith("Size ") && m.includes("not in selected range"));
    if (sizeMismatchStringIndex !== -1) {
      mismatches.splice(sizeMismatchStringIndex, 1);
    }
    
  }

  score = Math.max(0, score); // Remove the 100 cap to allow guidance bonuses
  return { score, matches, mismatches, matchedPrefs, unmetPrefs, expansions: eff.expansionNotes };
}

// Enhanced Top Picks selection with hypoallergenic filtering
export async function selectTopPicks(
  dogs: Dog[],
  userPreferences: UserPreferences,
  maxPicks: number = 3
): Promise<{ dogs: Dog[]; showFallbackBanner: boolean }> {
  console.log('🎯 AI TOP PICKS: Starting selection process for', dogs.length, 'dogs');
  console.log('🎯 AI TOP PICKS: User preferences:', userPreferences);
  
  try {
    // Filter out dogs with no photos
    const filteredDogs = dogs.filter(dog => dog.photos?.length > 0);
    console.log('🎯 AI TOP PICKS: After filtering no-photo dogs:', filteredDogs.length, 'dogs remain');
    
    if (filteredDogs.length === 0) {
      console.log('🎯 AI TOP PICKS: No dogs with photos, returning empty array');
      return { dogs: [], showFallbackBanner: false };
    }
    
    // Special handling for hypoallergenic preference
    const wantsHypoallergenic = userPreferences.temperament?.includes('hypoallergenic');
    let showFallbackBanner = false;
    
    if (wantsHypoallergenic) {
      // Phase 1: Try to find only hypoallergenic dogs
      const hypoDogs = filteredDogs.filter(dog => {
        const analysis = buildAnalysis(dog, userPreferences);
        return analysis.matchedPrefs.some(p => p.label === 'hypoallergenic');
      });
      
      console.log('🎯 AI TOP PICKS: Found', hypoDogs.length, 'hypoallergenic dogs');
      
      if (hypoDogs.length >= maxPicks) {
        // We have enough hypoallergenic dogs, use only those
        const analyses = hypoDogs.map(dog => ({
          dog,
          analysis: buildAnalysis(dog, userPreferences)
        }));
        
        const topPicks = analyses
          .filter(a => a.analysis.score > 0)
          .sort((a, b) => {
            if (b.analysis.score !== a.analysis.score) {
              return b.analysis.score - a.analysis.score;
            }
            return a.dog.location.distanceMi - b.dog.location.distanceMi;
          })
          .slice(0, maxPicks)
          .map(a => a.dog);
        
        console.log('🎯 AI TOP PICKS: Selected', topPicks.length, 'hypoallergenic top picks');
        return { dogs: topPicks, showFallbackBanner: false };
      } else {
        // Phase 2: Not enough hypoallergenic dogs, show fallback banner
        showFallbackBanner = true;
        console.log('🎯 AI TOP PICKS: Not enough hypoallergenic dogs, showing fallback banner');
      }
    }
    
    // Default behavior: build analysis for all dogs and select top picks
    const analyses = filteredDogs.map(dog => ({
      dog,
      analysis: buildAnalysis(dog, userPreferences)
    }));
    
    // Filter out dogs with score 0 and sort by score (highest first), then by distance
    const topPicks = analyses
      .filter(a => a.analysis.score > 0)
      .sort((a, b) => {
        // Primary sort: score (highest first)
        if (b.analysis.score !== a.analysis.score) {
          return b.analysis.score - a.analysis.score;
        }
        // Secondary sort: distance (closer first)
        return a.dog.location.distanceMi - b.dog.location.distanceMi;
      })
      .slice(0, maxPicks)
      .map(a => a.dog);
    
    console.log('🎯 AI TOP PICKS: Selected', topPicks.length, 'top picks:', topPicks.map(d => d.name));
    
    // Log analysis details for top picks
    topPicks.forEach(dog => {
      const analysis = buildAnalysis(dog, userPreferences);
      console.log(`🎯 ${dog.name}: Score ${analysis.score}, Matches: [${analysis.matches.join(', ')}], Mismatches: [${analysis.mismatches.join(', ')}]`);
    });
    
    return { dogs: topPicks, showFallbackBanner };
    
  } catch (error) {
    console.error('❌ Top Picks selection error, using fallback:', error);
    // Fallback to first few dogs with photos
    return { dogs: dogs.filter(dog => dog.photos?.length > 0).slice(0, maxPicks), showFallbackBanner: false };
  }
}

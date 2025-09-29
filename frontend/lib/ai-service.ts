// AI Service for generating dog recommendations using OpenAI API

import { Dog, UserPreferences, buildAnalysis, deriveFeatures, Analysis } from '@/utils/matching';
import { tryParseReasoning, tryParseShortReasoning } from '@/utils/parseLLM';

export interface AIReasoning {
  primary: string;
  additional: string[];
  concerns: string[];
}

export interface AIScore {
  dog: Dog;
  score: number;
  reasoning: string;
}

// Removed: selectTopPicks moved to utils/matching.ts

// Removed: scoreDogForUser - now using deterministic scoring

// Removed: filterMismatchedDogs and createScoringPrompt - now using deterministic analysis

// Generate AI reasoning for Top Picks using deterministic analysis
export async function generateTopPickReasoning(
  dog: Dog, 
  userPreferences: UserPreferences,
  analysis: Analysis
): Promise<AIReasoning> {
  const DEBUG = false;
  if (DEBUG) {
    console.log('🔍 DEBUG: User Preferences being used:', userPreferences);
    console.log('🐕 DEBUG: Dog being analyzed:', dog.name, dog.breeds, dog.size);
    console.log('🎯 DETERMINISTIC ANALYSIS:', analysis);
  }
  
  // Filter out default-derived matches so the model doesn't claim them as user preferences
  const filteredAnalysis: Analysis = {
    ...analysis,
    matchedPrefs: (analysis.matchedPrefs || []).filter((p: any) => p.origin !== 'default')
  };

  // Compute a soft defaults note (for age, mainly) when nothing was selected
  const noAgeSelected = !(userPreferences.age && userPreferences.age.length > 0);
  const hasDefaultAgeMatch = (analysis.matchedPrefs || []).some((p: any) => p.key === 'age' && p.origin === 'default');
  const defaultsNote = noAgeSelected && hasDefaultAgeMatch
    ? 'showing recent listings by default since no age was selected'
    : 'none';

  const prompt = createTopPickPrompt(dog, userPreferences, filteredAnalysis, defaultsNote);
  console.log('📤 DEBUG: Prompt sent to AI with analysis');
  
  try {
    if (DEBUG) console.log('🚀 Calling OpenAI API for Top Pick reasoning...');
    const response = await fetch('/api/ai-reasoning', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, type: 'top-pick' }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    if (DEBUG) console.log('🎯 OpenAI response received:', data);
    
    // HANDLE MIXED RESPONSE TYPES - parse string responses intelligently
    let reasoning = data.reasoning;
    if (typeof reasoning === 'string') {
      // Try to parse JSON from the string response
      const parsed = tryParseReasoning(reasoning);
      if (parsed) {
        reasoning = parsed;
        if (DEBUG) console.log('✅ Successfully parsed JSON from string response');
      } else {
        // Fall back to simple string conversion if parsing fails
        reasoning = {
          primary: reasoning.substring(0, 150),
          additional: [],
          concerns: []
        };
        if (DEBUG) console.log('⚠️ Could not parse JSON, using fallback string conversion');
      }
    }
    // Post-sanitization: ensure the primary only cites user/guidance-origin prefs
    try {
      const allowedKeys = new Set((analysis.matchedPrefs || []).filter((p: any) => p.origin !== 'default').map((p: any) => p.key));
      const needsNeutral = (k: string) => !allowedKeys.has(k);
      let primary = reasoning.primary || '';
      const hasGuidance = !!(userPreferences.guidance && userPreferences.guidance.trim().length > 0);
      const guidanceLower = (userPreferences.guidance || '').toLowerCase();
      // Remove common template fragments if their key is default-only
      if (needsNeutral('age')) {
        primary = primary.replace(/\b(Baby|Young|Adult|Senior) age matches your preference\b/gi, '');
      }
      if (needsNeutral('size')) {
        primary = primary.replace(/\b(Small|Medium|Large|XL|Extra Large) size (?:fits your (?:needs|apartment|living space)|is suitable for your needs)\b/gi, '');
      }
      if (needsNeutral('energy')) {
        primary = primary.replace(/\bEnergy level matches\s*\((low|medium|high)\)\b/gi, '');
      }
      if (needsNeutral('temperament')) {
        primary = primary.replace(/\b(hypoallergenic|quiet|good with kids) (?:matches your preference|fits your needs)\b/gi, '');
      }
      // If user did not mention apartment in guidance, avoid apartment-specific phrasing
      if (!/apartment/.test(guidanceLower)) {
        primary = primary
          .replace(/\byour apartment needs\b/gi, 'your needs')
          .replace(/\bsuits your apartment\b/gi, 'suits your needs')
          .replace(/\bfits your apartment\b/gi, 'fits your needs')
          .replace(/\bapartment\b/gi, 'home');
      }
      // Remove dangling conjunctions, then collapse spaces/punctuation
      primary = primary.replace(/\b(and|\+|,)?\s*$/i, '').trim();
      primary = primary.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.').replace(/\s+,/g, ',').trim();
      if (!primary || primary.length < 12) {
        primary = hasGuidance
          ? 'A promising match based on your note and recent listings.'
          : 'A promising match based on popular trends and recent listings.';
      }
      // If the model mentioned "your note" but the user provided no guidance, rephrase to trends
      if (!hasGuidance) {
        primary = primary.replace(/based on your note/gi, 'based on popular trends');
      }
      // If defaults note exists, append a short clause
      const noAgeSelected = !(userPreferences.age && userPreferences.age.length > 0);
      const hasDefaultAgeMatch = (analysis.matchedPrefs || []).some((p: any) => p.key === 'age' && p.origin === 'default');
      if (noAgeSelected && hasDefaultAgeMatch && !/recent listings by default|popular (with )?adopters/i.test(primary)) {
        primary = `${primary} — ${hasGuidance ? 'recent listings by default' : 'popular with adopters right now'}`;
      }
      reasoning.primary = primary.substring(0, 150);
    } catch (e) {
      console.log('ℹ️ Primary sanitization skipped:', e);
    }
    
    // Post-processing guardrails
    // If unmetPrefs exist but concerns are empty, add them
    if (filteredAnalysis.unmetPrefs.length > 0 && reasoning.concerns.length === 0) {
      reasoning.concerns = [
        ...filteredAnalysis.unmetPrefs.map((x: any) => x.label),
        ...analysis.mismatches
      ];
    }
    
    // Never claim hypoallergenic unless in matchedPrefs
    const hasHypoMatch = filteredAnalysis.matchedPrefs.some((p: any) => p.key === 'temperament' && /hypoallergenic/i.test(p.label));
    if (reasoning.primary.toLowerCase().includes('hypoallergenic') && !hasHypoMatch) {
      reasoning.primary = "Affectionate companion";
      reasoning.concerns.push("Not hypoallergenic");
    }
    
    console.log('✅ FINAL reasoning for', dog.name, ':', reasoning);
    
    return reasoning;
  } catch (error) {
    console.error('❌ AI reasoning error, using fallback:', error);
    // Fallback to basic reasoning
    return generateFallbackReasoning(dog);
  }
}

// Generate AI reasoning for All Matches using deterministic analysis
export async function generateAllMatchReasoning(
  dog: Dog, 
  userPreferences: UserPreferences,
  analysis: Analysis
): Promise<string> {
  console.log('🔍 DEBUG: All Match user preferences:', userPreferences);
  console.log('🎯 DETERMINISTIC ANALYSIS (All Match):', analysis);
  
  const filteredAnalysis: Analysis = {
    ...analysis,
    matchedPrefs: (analysis.matchedPrefs || []).filter((p: any) => p.origin !== 'default')
  };
  const noAgeSelected = !(userPreferences.age && userPreferences.age.length > 0);
  const hasDefaultAgeMatch = (analysis.matchedPrefs || []).some((p: any) => p.key === 'age' && p.origin === 'default');
  const defaultsNote = noAgeSelected && hasDefaultAgeMatch ? 'recent default listing' : 'none';

  const prompt = createAllMatchPrompt(dog, userPreferences, filteredAnalysis, defaultsNote);
  
  try {
    console.log('🚀 Calling OpenAI API for All Match reasoning...');
    const response = await fetch('/api/ai-reasoning', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, type: 'all-match' }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🎯 OpenAI response received:', data);
    
    let blurb = data.reasoning;
    
    // Try to parse JSON from string response
    if (typeof blurb === 'string') {
      const parsed = tryParseShortReasoning(blurb);
      if (parsed) {
        blurb = parsed;
        console.log('✅ Successfully parsed short reasoning from string response');
      } else {
        // Fall back to simple truncation if parsing fails
        blurb = blurb.substring(0, 50);
        console.log('⚠️ Could not parse short reasoning, using fallback truncation');
      }
    }
    
    // Post-processing guardrails
    // Never claim hypoallergenic unless in matchedPrefs
    const hasHypoMatch = analysis.matchedPrefs.some(p => p.label === "hypoallergenic");
    if (blurb.toLowerCase().includes('hypoallergenic') && !hasHypoMatch) {
      blurb = "Friendly companion";
    }
    
    // If blurb contains words from unmetPrefs, replace with first matchedPref
    const forbiddenWords = analysis.unmetPrefs.flatMap(p => p.label.toLowerCase().split(' '));
    const hasForbidden = forbiddenWords.some(word => blurb.toLowerCase().includes(word));
    if (hasForbidden && analysis.matchedPrefs.length > 0) {
      blurb = analysis.matchedPrefs[0].label;
    }
    
    return blurb;
  } catch (error) {
    console.error('❌ AI reasoning error, using fallback:', error);
    // Fallback to basic reasoning
    return generateFallbackShortReasoning(dog);
  }
}

// Create detailed prompt for Top Picks using deterministic analysis
function createTopPickPrompt(dog: Dog, userPreferences: UserPreferences, analysis: Analysis, defaultsNote: string = 'none'): string {
  const breedInfo = dog.breeds.join(', ');
  const ageInfo = dog.age;
  const sizeInfo = dog.size;
  const locationInfo = `${dog.location.city}, ${dog.location.state}`;

  // Debug logging for age values
  console.log('🔍 DEBUG: User age preferences:', userPreferences.age);
  console.log('🔍 DEBUG: Dog age:', dog.age);
  console.log('🔍 DEBUG: Dog age type:', typeof dog.age);
  console.log('🔍 DEBUG: User age types:', userPreferences.age?.map(a => typeof a));
  console.log('🔍 DEBUG: Age match check (exact):', userPreferences.age?.includes(dog.age));
  
  // Case-insensitive check
  const dogAgeLower = dog.age?.toLowerCase()?.trim();
  const userAgesLower = userPreferences.age?.map(a => a?.toLowerCase()?.trim());
  const ageMatchInsensitive = userAgesLower?.includes(dogAgeLower);
  console.log('🔍 DEBUG: Age match check (case-insensitive):', ageMatchInsensitive);

  return `You convert structured adoption analysis into JSON with a friendly, human voice:
- primary (≤150 chars): Write ONE complete, natural sentence in second person, like a warm adoption counselor. Weave at least TWO matched preferences by name into a single flowing sentence (e.g., "Adult age matches your preference and Medium size suits your apartment"). Do NOT use '+' signs, lists, fragments, or bullets.
- additional: up to 2 short supporting phrases (≤50 chars) only if truly necessary; otherwise leave empty.
- concerns: List unmet preferences as practical advice (no bullets required in UI). Use phrases like "This dog is a shedding breed and does not meet your hypoallergenic requirement" instead of "Not hypoallergenic."

CRITICAL: The primary reason MUST reference specific user preferences by name. Use phrases like:
- "Adult age matches your preference" (not just "adult dog")
- "Medium size fits your apartment needs" (not just "medium size")
- "Hypoallergenic temperament meets your allergy requirements" (not just "hypoallergenic")

PRIORITIZE: Guidance traits (hypoallergenic, size, energy) should outrank generic traits like "affectionate."

🎯 IMPORTANT: User selections are OR logic, not AND logic. 
For example, if user selects Young, Adult, the dog may be either Young OR Adult to be considered a match.

AGE CHECK: User selected ${userPreferences.age?.join(' OR ') || 'any age'}. 
If the dog's age is either ${userPreferences.age?.join(' OR ') || 'any'}, this is a valid match. 
Do NOT mark this as a mismatch unless the dog is outside ALL of the selected categories.

✅ Dog = ${dog.age}, User = ${userPreferences.age?.join(' OR ') || 'any'} → "Matches your age preference."
❌ Dog = Senior, User = ${userPreferences.age?.join(' OR ') || 'any'} → "Does not match age preferences."

FORBIDDEN: Generic phrases like "located in...", "perfect for you" (use once max), "great companion" without specifics.

DOG: ${dog.name} (${breedInfo}) • ${ageInfo} • ${sizeInfo} • ${locationInfo}
USER_PREFERENCES:
  ages=${userPreferences.age?.join(', ') || 'any'} sizes=${userPreferences.size?.join(', ') || 'any'} includeBreeds=${userPreferences.includeBreeds?.join(', ') || 'any'} excludeBreeds=${userPreferences.excludeBreeds?.join(', ') || 'none'}
  energy=${userPreferences.energy || 'any'} temperament=${userPreferences.temperament?.join(', ') || 'any'}
GUIDANCE: "${userPreferences.guidance || 'none'}"

ANALYSIS:
  // Only use matchedPrefs for claims; do NOT use the generic matches list
  mismatches: [${analysis.mismatches.join(', ')}]
  matchedPrefs: [${analysis.matchedPrefs.map(p => `{key:"${p.key}", label:"${p.label}"}`).join(', ')}]
  unmetPrefs: [${analysis.unmetPrefs.map(p => `{key:"${p.key}", label:"${p.label}"}`).join(', ')}]
  score: ${analysis.score}

DEFAULTS_NOTE: ${defaultsNote}

If ANALYSIS.expansions exists, you may add one short clause acknowledging expansion (e.g., "We included Medium size based on your note"), but still cite matchedPrefs by name.

IMPORTANT: matchedPrefs may include default-derived items (origin = default). In the primary sentence, only cite user/guidance items. If DEFAULTS_NOTE != 'none', add ONE short clause at the end (≤20 chars) acknowledging the default (e.g., "— recent listings by default"). Do NOT present defaults as user preferences. Ignore other arrays for claims.

Return minified JSON only. No backticks / fences. The JSON must be exactly of the form below:
{"primary":"...", "additional":["..."], "concerns":["..."]}`;
}

// Create concise prompt for All Matches using deterministic analysis
function createAllMatchPrompt(dog: Dog, userPreferences: UserPreferences, analysis: Analysis, defaultsNote: string = 'none'): string {
  const breedInfo = dog.breeds.join(', ');

  // Debug logging for age values
  console.log('🔍 DEBUG (All Matches): User age preferences:', userPreferences.age);
  console.log('🔍 DEBUG (All Matches): Dog age:', dog.age);
  console.log('🔍 DEBUG (All Matches): Dog age type:', typeof dog.age);
  console.log('🔍 DEBUG (All Matches): User age types:', userPreferences.age?.map(a => typeof a));
  console.log('🔍 DEBUG (All Matches): Age match check (exact):', userPreferences.age?.includes(dog.age));
  
  // Case-insensitive check
  const dogAgeLower = dog.age?.toLowerCase()?.trim();
  const userAgesLower = userPreferences.age?.map(a => a?.toLowerCase()?.trim());
  const ageMatchInsensitive = userAgesLower?.includes(dogAgeLower);
  console.log('🔍 DEBUG (All Matches): Age match check (case-insensitive):', ageMatchInsensitive);

  return `Produce one ≤50 char blurb as a single natural phrase referencing ONE matched preference by name.
Never reference unmetPrefs or mismatches. Never claim hypoallergenic unless matchedPrefs contains it. Avoid '+' signs or lists.

CRITICAL: Reference the specific user preference by name, not just the trait:
- "Adult age matches your preference" (not just "adult dog")
- "Medium size fits your needs" (not just "medium size")
- "Hypoallergenic temperament" (not just "hypoallergenic")

🎯 IMPORTANT: User selections are OR logic, not AND logic. 
For example, if user selects Young, Adult, the dog may be either Young OR Adult to be considered a match.

AGE CHECK: User selected ${userPreferences.age?.join(' OR ') || 'any age'}. 
If the dog's age is either ${userPreferences.age?.join(' OR ') || 'any'}, this is a valid match. 
Do NOT mark this as a mismatch unless the dog is outside ALL of the selected categories.

✅ Dog = ${dog.age}, User = ${userPreferences.age?.join(' OR ') || 'any'} → "Matches your age preference."
❌ Dog = Senior, User = ${userPreferences.age?.join(' OR ') || 'any'} → "Does not match age preferences."

FORBIDDEN: Generic phrases, location mentions, "perfect for you" without specifics.

DOG: ${dog.name} • ${breedInfo}
USER_PREFERENCES:
  ages=${userPreferences.age?.join(', ') || 'any'} sizes=${userPreferences.size?.join(', ') || 'any'} includeBreeds=${userPreferences.includeBreeds?.join(', ') || 'any'} excludeBreeds=${userPreferences.excludeBreeds?.join(', ') || 'none'}
  energy=${userPreferences.energy || 'any'} temperament=${userPreferences.temperament?.join(', ') || 'any'}
GUIDANCE: "${userPreferences.guidance || 'none'}"

ANALYSIS:
  matches: [${analysis.matches.join(', ')}]
  mismatches: [${analysis.mismatches.join(', ')}]
  matchedPrefs: [${analysis.matchedPrefs.map(p => `{key:"${p.key}", label:"${p.label}"}`).join(', ')}]
  unmetPrefs: [${analysis.unmetPrefs.map(p => `{key:"${p.key}", label:"${p.label}"}`).join(', ')}]
  score: ${analysis.score}

DEFAULTS_NOTE: ${defaultsNote}

If ANALYSIS.expansions exists, you may add one short clause acknowledging expansion, but still reference matchedPrefs by name only.

IMPORTANT: If matchedPrefs is empty or only includes default-derived items, produce a neutral phrase (e.g., "Recent listing with broad appeal"). Do not cite defaults as preferences.

Return minified text only. No backticks / fences:`;
}

// Fallback reasoning when AI fails
function generateFallbackReasoning(dog: Dog): AIReasoning {
  const breed = dog.breeds[0]?.toLowerCase() || 'mixed';
  const age = dog.age.toLowerCase();
  const size = dog.size.toLowerCase();
  
  let primary = "Great potential as a loving companion";
  
  if (breed.includes('golden') || breed.includes('labrador')) {
    primary = "Gentle & patient - perfect for families";
  } else if (breed.includes('border collie') || breed.includes('australian shepherd')) {
    primary = "Smart & energetic - perfect for active owners";
  } else if (breed.includes('poodle')) {
    primary = "Hypoallergenic & intelligent companion";
  }
  
  const additional = [];
  if (age.includes('puppy') || age.includes('baby')) {
    additional.push("Young & trainable");
  } else if (age.includes('adult')) {
    additional.push("Pre-trained adult");
  }
  
  if (size.includes('small')) {
    additional.push("Apartment friendly");
  } else if (size.includes('large')) {
    additional.push("Active companion");
  }
  
  return {
    primary,
    additional: additional.slice(0, 2),
    concerns: []
  };
}

// Fallback short reasoning when AI fails
function generateFallbackShortReasoning(dog: Dog): string {
  const breed = dog.breeds[0]?.toLowerCase() || 'mixed';
  const age = dog.age.toLowerCase();
  
  if (breed.includes('golden') || breed.includes('labrador')) {
    return "Gentle family dog";
  } else if (breed.includes('border collie') || breed.includes('australian shepherd')) {
    return "Smart & energetic";
  } else if (breed.includes('poodle')) {
    return "Hypoallergenic & smart";
  } else if (age.includes('puppy') || age.includes('baby')) {
    return "Young & trainable";
  } else if (age.includes('adult')) {
    return "Pre-trained adult";
  } else {
    return "Great companion";
  }
}
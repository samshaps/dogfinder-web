import { Dog, EffectivePreferences, DogAnalysis, Origin } from './schemas';
import { buildFactPack } from './facts';
import { verifyBlurb, verifyBlurbWithTemperament } from './verify';
import { COPY_MAX, COPY_SOFT } from './constants/copyLimits';
import { getMultiBreedTemperaments, TemperamentTrait } from './breedTemperaments';
import { buildReasoningMessages } from './reasoning-messages';

function resolveApiUrl(path: string): string {
  if (typeof window === 'undefined') {
    const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const normalized = String(base).startsWith('http') ? String(base) : `https://${base}`;
    return `${normalized}${path}`;
  }
  return path;
}

/**
 * Explanation Layer
 * LLM-powered explanation generation with guardrails and fallbacks
 */

/**
 * Determine if a temperament trait is proven (dog evidence) or likely (breed prior)
 */
function getTemperamentEvidenceSource(
  trait: TemperamentTrait, 
  dog: Dog, 
  breedTemperaments: Partial<Record<TemperamentTrait, number>>
): 'proven' | 'likely' | 'none' {
  // Check for explicit dog evidence first
  const dogEvidence = dog.temperament?.includes(trait) ? 1 : 0;
  const breedPrior = (breedTemperaments[trait] || 0) / 3;
  
  // If we have explicit dog evidence, it's proven
  if (dogEvidence > 0) {
    return 'proven';
  }
  
  // If we have a strong breed prior (>= 0.67, i.e., score >= 2), it's likely
  if (breedPrior >= 0.67) {
    return 'likely';
  }
  
  return 'none';
}

/**
 * Create a sanitized fact bundle for LLM prompts (no defaults)
 */
function createFactBundle(dog: Dog, analysis: DogAnalysis, effectivePrefs: EffectivePreferences): string {
  const fp = buildFactPack(effectivePrefs, dog);
  const prefs = fp.prefs.join(', ') || 'none explicitly provided';
  const traits = fp.dogTraits.join(', ') || 'limited';
  return `User preferences: ${prefs}\nDog facts: ${traits}`;
}

/**
 * Create prompt for Top 3 reasoning
 */
function createTop3Prompt(dog: Dog, analysis: DogAnalysis, effectivePrefs: EffectivePreferences): string {
  const facts = buildFactPack(effectivePrefs, dog);
  const hasPrefs = (facts.prefs || []).length > 0;

  // Matched facets
  const dogSize = String(dog.size || '').toLowerCase();
  const userSizes = effectivePrefs.size.value.map(s => String(s).toLowerCase());
  const sizeMatched = userSizes.length > 0 && userSizes.includes(dogSize);

  const dogAge = String(dog.age || '').toLowerCase();
  const userAges = effectivePrefs.age.value.map(a => String(a).toLowerCase());
  const ageMatched = userAges.length > 0 && userAges.includes(dogAge);

  // Breed exact vs fuzzy
  const userInclude = (effectivePrefs.breeds.include || []).map(b => b.toLowerCase());
  const dogBreedsLower = (dog.breeds || []).map(b => b.toLowerCase());
  const exactBreed = dogBreedsLower.find(b => userInclude.includes(b));
  const breed_exact = Boolean(exactBreed);
  const breed_label = exactBreed ? exactBreed.replace(/\b\w/g, c => c.toUpperCase()) : '';
  const breed_fuzzy = !breed_exact && effectivePrefs.breeds.expandedInclude.length > 0;

  // Temperament evidence analysis
  const breedTemperaments = getMultiBreedTemperaments(dog.breeds);
  const temperamentEvidence: Record<string, 'proven' | 'likely' | 'none'> = {};
  const userTemperaments = effectivePrefs.temperament.value as TemperamentTrait[];
  
  for (const trait of userTemperaments) {
    temperamentEvidence[trait] = getTemperamentEvidenceSource(trait, dog, breedTemperaments);
  }

  const matched_facets = {
    age: ageMatched,
    size: sizeMatched,
    breed_exact,
    breed_fuzzy,
    temperaments: (effectivePrefs.temperament.value || []).length > 0,
    temperament_evidence: temperamentEvidence
  };

  const header = [
    `Write ONE sentence ≤ 135 characters using OR-based matching logic.`,
    `Address the reader only as "you". No names/PII.`,
    `"You" refers ONLY to the adopter; never address the dog as "you".`,
    hasPrefs
      ? `ONLY cite user preferences that are explicitly listed in the "User preferences" section below. Do NOT invent or assume any user preferences. Highlight which actual user preferences were satisfied with supportive citations (e.g., "Matches your requested calm temperament"). Note any gaps without discarding the option (e.g., "Doesn't meet the low-shedding request but excels in other areas"). Emphasize that partial matches are acceptable and valuable.`
      : `Do NOT mention user preferences, desires, or wants. Focus on highlighting the breed's most positive and appealing characteristics that make them wonderful companions. Emphasize what makes this breed special - their unique personality, temperament, intelligence, loyalty, or other notable traits. Use engaging phrases like "known for", "renowned for", "famous for", "typically", or "often" when describing breed characteristics. Make it feel personal and compelling by highlighting why this breed could be a wonderful addition to someone's life. Focus on positive attributes that would appeal to potential adopters. Examples: "A gentle Great Pyrenees known for being protective and loyal" or "A highly intelligent Australian Shepherd renowned for being energetic and great with active families".`,
    `Do not introduce attributes not present in the lists below.`,
    `Use only the info below; no assumptions.`,
    `If matched_facets.size=true, you must cite the dog's size bucket (Small/Medium/Large/XL).`,
    `If matched_facets.breed_exact=true, explicitly cite the exact breed (e.g., "${breed_label}").`,
    `For temperament traits:`,
    `  - If temperament_evidence[trait]="proven": use definitive phrasing ("is kid-friendly")`,
    `  - If temperament_evidence[trait]="likely": use tendency phrasing ("tends to be kid-friendly")`,
    `Never mention UI terms like "included breeds" or "filters"; refer to breed concepts instead (e.g., "Labrador mix").`,
    `Use OR-based matching to reward overlap rather than requiring all facets to match.`,
    `Return JSON exactly as: {"text":"<=135 chars","cited":["..."]}. No extra text.`,
  ].join('\n');

  const body = [
    `User preferences: ${facts.prefs.join(', ') || 'none explicitly provided'}`,
    `Dog facts: ${facts.dogTraits.join(', ') || 'limited'}`,
    `Matched facets: ${JSON.stringify(matched_facets)}`,
    breed_exact ? `Exact breed label: ${breed_label}` : ''
  ].filter(Boolean).join('\n');

  return `${header}\n\n${body}`;
}

/**
 * Create prompt for All Matches reasoning
 */
function createAllMatchesPrompt(dog: Dog, analysis: DogAnalysis, effectivePrefs: EffectivePreferences): string {
  const facts = buildFactPack(effectivePrefs, dog);
  const hasPrefs = (facts.prefs || []).length > 0;
  const prompt = [
    'Write one short phrase (<=50 chars) about this dog using OR-based matching logic.',
    hasPrefs 
      ? 'ONLY highlight user preferences that are explicitly listed below. Do NOT invent or assume any user preferences.'
      : 'Do NOT mention user preferences. Focus on the dog\'s positive traits and characteristics only.',
    'Base it only on the provided user preferences and dog facts. Avoid assumptions.',
    'Emphasize partial matches positively rather than focusing on what\'s missing.',
    '',
    `User preferences: ${facts.prefs.join(', ') || 'none explicitly provided'}`,
    `Dog facts: ${facts.dogTraits.join(', ') || 'limited'}`,
  ].join('\n');
  return prompt;
}

/**
 * Parse JSON response with robust error handling
 */
function parseJSONResponse(response: string): any {
  try {
    // Remove code fences if present
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON from mixed content
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return null;
  }
}

/**
 * Generate AI reasoning for Top 3 dogs
 */
export async function generateTop3Reasoning(
  dog: Dog, 
  analysis: DogAnalysis, 
  effectivePrefs: EffectivePreferences
): Promise<{ primary: string; additional: string[]; concerns: string[] }> {
  const BODY_CAP = COPY_MAX.TOP - 1; // leave room to append final period
  const debug = (() => {
    if (typeof window !== 'undefined') {
      try { return new URLSearchParams(window.location.search).get('DEBUG_REASONING') === '1'; } catch { return false; }
    }
    return process.env.DEBUG_REASONING === '1';
  })();
  const prompt = createTop3Prompt(dog, analysis, effectivePrefs);
  const facts = buildFactPack(effectivePrefs, dog);
  try {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[reasoning] TOP150 prompt:', prompt);
      // eslint-disable-next-line no-console
      console.log('[reasoning] FactPack:', facts);
    }
    const response = await fetch(resolveApiUrl('/api/ai-reasoning'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: 'free', max_tokens: 50, temperature: 0.1 }),
    });
    if (!response.ok) throw new Error(`AI service error: ${response.status}`);
    const data = await response.json();
    const raw = typeof data.reasoning === 'string' ? data.reasoning : '';
    const parsed = parseJSONResponse(raw);
    let text = typeof parsed?.text === 'string' ? parsed.text : '';
    const cited = Array.isArray(parsed?.cited) ? parsed.cited : [];
    const hasPrefs = (facts.prefs || []).length > 0;
    if (hasPrefs && cited.length === 0) {
      throw new Error('No cited preferences returned');
    }
    // Minimal post-processing
    let processed = scrubPII(text);
    processed = sanitizePerspective(processed);
    if (!hasPrefs) processed = sanitizeNoPreferenceClaims(processed);
    // Verification and tighten pass (with temperament checking)
    const v = verifyBlurbWithTemperament(processed, facts, dog, { lengthCap: BODY_CAP });
    processed = v.fixed;
    const primaryFinal = finalClamp(processed, COPY_MAX.TOP);
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[TOP LEN]', primaryFinal.length, primaryFinal);
    }
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[reasoning] TOP150 final (ai=true):', primaryFinal);
    }
    return { primary: primaryFinal, additional: [], concerns: [] };
  } catch (error) {
    console.warn('AI reasoning failed, using fallback:', error);
  }
  const fb = generateFallbackTop3Reasoning(dog, analysis, effectivePrefs);
  const debug2 = (() => {
    if (typeof window !== 'undefined') {
      try { return new URLSearchParams(window.location.search).get('DEBUG_REASONING') === '1'; } catch { return false; }
    }
    return process.env.DEBUG_REASONING === '1';
  })();
  if (debug2) {
    // eslint-disable-next-line no-console
    console.log('[reasoning] TOP150 final (ai=false):', fb.primary);
  }
  let fbProcessed = scrubPII(fb.primary);
  fbProcessed = sanitizePerspective(fbProcessed);
  if ((buildFactPack(effectivePrefs, dog).prefs || []).length === 0) {
    fbProcessed = sanitizeNoPreferenceClaims(fbProcessed);
  }
  const v2 = verifyBlurbWithTemperament(fbProcessed, buildFactPack(effectivePrefs, dog), dog, { lengthCap: BODY_CAP });
  return { ...fb, primary: finalClamp(v2.fixed, COPY_MAX.TOP) };
}

export async function generateAllMatchesReasoning(): Promise<string> {
  return '';
}

/**
 * Fallback reasoning for Top 3 when AI fails
 */
function generateFallbackTop3Reasoning(
  dog: Dog,
  analysis: DogAnalysis,
  effectivePrefs: EffectivePreferences
): { primary: string; additional: string[]; concerns: string[] } {
  const fp = buildFactPack(effectivePrefs, dog);
  const hasPrefs = (fp.prefs || []).length > 0;
  const matchedPrefs = analysis.matchedPrefs.slice(0, 2);
  
  let primary: string;
  if (hasPrefs && matchedPrefs.length > 0) {
    // Only cite actual matched preferences
    primary = `${matchedPrefs.join(' and ')} make this a great match for you.`;
  } else if (hasPrefs) {
    // User has preferences but no matches - focus on dog traits
    const dogTrait = fp.dogTraits.find(t => t.endsWith(' energy') || ['small','medium','large','xl'].includes(t) || t === 'quiet' || t.includes('friendly')) || '';
    primary = dogTrait ? `A ${dogTrait} ${dog.breeds[0] || 'dog'}.` : `${dog.name} is a wonderful ${dog.breeds[0] || 'dog'}.`;
  } else {
    // No user preferences - highlight breed's positive characteristics with engaging descriptions
    const breedName = dog.breeds[0] || 'dog';
    const size = dog.size ? `${dog.size.toLowerCase()} ` : '';
    
    // Create breed-specific positive descriptions
    const breedDescriptions: Record<string, string[]> = {
      'great pyrenees': ['gentle giants', 'protective', 'calm', 'loyal', 'excellent with families'],
      'australian shepherd': ['highly intelligent', 'energetic', 'loyal', 'excellent working dogs', 'great with active families'],
      'golden retriever': ['friendly', 'intelligent', 'loyal', 'great with kids', 'easy to train'],
      'labrador retriever': ['friendly', 'outgoing', 'loyal', 'great family dogs', 'easy to train'],
      'german shepherd': ['intelligent', 'loyal', 'protective', 'versatile', 'excellent working dogs'],
      'border collie': ['highly intelligent', 'energetic', 'loyal', 'excellent herding dogs', 'great for active owners'],
      'beagle': ['friendly', 'curious', 'great with kids', 'loyal', 'good family dogs'],
      'poodle': ['intelligent', 'hypoallergenic', 'loyal', 'easy to train', 'great family dogs'],
      'bulldog': ['calm', 'friendly', 'loyal', 'great apartment dogs', 'good with kids'],
      'siberian husky': ['energetic', 'friendly', 'loyal', 'beautiful', 'great for active families']
    };
    
    // Find matching breed description
    const breedKey = breedName.toLowerCase();
    const breedTraits = breedDescriptions[breedKey] || breedDescriptions[Object.keys(breedDescriptions).find(key => breedKey.includes(key)) || ''] || [];
    
    if (breedTraits.length > 0) {
      // Use the first 2-3 most appealing traits
      const selectedTraits = breedTraits.slice(0, 2);
      primary = `A ${size}${breedName} known for being ${selectedTraits.join(' and ')}.`;
    } else {
      // Fallback to generic positive description
      const energy = fp.dogTraits.find(t => t.endsWith(' energy'))?.replace(' energy', '') || '';
      const temperament = fp.dogTraits.find(t => t.includes('friendly') || t.includes('calm') || t.includes('loyal')) || '';
      
      if (energy && temperament) {
        primary = `A ${size}${breedName} known for being ${energy} and ${temperament}.`;
      } else if (energy) {
        primary = `A ${size}${breedName} with ${energy} energy and great potential.`;
      } else if (temperament) {
        primary = `A ${size}${breedName} known for being ${temperament}.`;
      } else {
        primary = `A wonderful ${size}${breedName} with great potential.`;
      }
    }
  }
  return { primary: primary.substring(0, 150), additional: [], concerns: [] };
}

/**
 * Fallback reasoning for All Matches when AI fails
 */
// All Matches fallback removed (no AI copy)

/**
 * Sanitize text to remove default claims and length violations
 */
export function sanitizeReasoning(text: string, maxLength: number = 150): string {
  let sanitized = text;
  
  // Remove default claims
  sanitized = sanitized.replace(/\b(default|standard|typical)\b/gi, '');
  
  // Remove location claims
  sanitized = sanitized.replace(/\b(located|near|in your area)\b/gi, '');
  
  // Clean up punctuation
  sanitized = sanitized.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').trim();
  
  // Scrub PII (names/emails/phones) and enforce sentence end
  sanitized = scrubPII(sanitized);
  if (sanitized && !sanitized.match(/[.!?]$/)) sanitized += '.';
  return sanitized.substring(0, maxLength);
}

/**
 * Remove accidental PII such as names, emails, and phone numbers.
 * Intentionally conservative to avoid destroying legitimate content while
 * stopping common hallucination shapes like "for you, Sarah!".
 */
export function scrubPII(text: string): string {
  let s = String(text || '');
  // Emails
  s = s.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '');
  // Phone numbers (basic North American + international forms)
  s = s.replace(/\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\b/g, '');
  // "for you, Sarah" or "for you Sarah" or "for you, Sarah!"
  s = s.replace(/(for you)[, ]+[A-Z][a-z]{2,}!?/g, '$1');
  // Trailing name after a comma or direct address patterns like "Thanks, Sarah!"
  s = s.replace(/,\s*[A-Z][a-z]{2,}!?(?=\s*$)/g, '');
  // Remove double spaces created by removals
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

/** Ensure text ends with a period without exceeding max length. */
function endWithPeriod(text: string, max: number): string {
  let t = String(text || '').trim();
  if (!t) return t;
  if (/[.!?]$/.test(t)) return t;
  if (t.length < max) return `${t}.`;
  // If already at max, replace last char with a period for a clean ending
  return `${t.slice(0, Math.max(0, max - 1))}.`;
}

/**
 * Deterministically rewrite any dog-addressing construct into adopter-addressing.
 * Examples:
 *   "You, a baby Great Dane-Boxer mix, ..." → "Baby Great Dane–Boxer mix — a great fit for you ..."
 */
export function sanitizePerspective(text: string): string {
  let s = String(text || '').trim();
  if (!s) return s;
  // Pattern: "You, a|an <np>, <rest>" → "<Np> — a great fit for you <rest>"
  const m = s.match(/^you,?\s+an?\s+([^,]+),(.*)$/i);
  if (m) {
    const np = m[1].trim();
    const rest = (m[2] || '').trim();
    const lead = np.charAt(0).toUpperCase() + np.slice(1);
    s = `${lead} — a great fit for you${rest ? ' ' + rest : ''}`;
  }
  // Pattern: "You are a|an <np> ..." → "A <np> — a great fit for you ..."
  const m2 = s.match(/^you\s+are\s+an?\s+([^,\.]+)([,.].*|\s.*|)$/i);
  if (m2) {
    const np = m2[1].trim();
    const rest = (m2[2] || '').trim();
    s = `${/^[aeiou]/i.test(np) ? 'An' : 'A'} ${np} — a great fit for you${rest ? ' ' + rest.replace(/^,/, '').trim() : ''}`;
  }
  // Avoid double spaces around dashes
  s = s.replace(/\s*—\s*/g, ' — ').replace(/\s{2,}/g, ' ').trim();
  return s;
}

/**
 * Final word-boundary clamp with clean ending punctuation. Ensures ≤ max chars,
 * avoids mid-word cutoff, strips trailing fragments, and ends with . ! or ?
 */
export function finalClamp(text: string, max: number): string {
  let s = String(text || '').trim();
  if (!s) return s;
  // Normalize whitespace and terminal punctuation clusters
  s = s.replace(/[\s\u00A0]+/g, ' ').replace(/[.]{2,}$/g, '.');
  if (s.length <= max) {
    if (!/[.!?]$/.test(s)) s = `${s}.`;
    return s;
  }
  // Cut to max then backtrack to last safe boundary
  const hard = s.slice(0, max);
  const boundary = Math.max(hard.lastIndexOf(' '), hard.lastIndexOf(','), hard.lastIndexOf('—'), hard.lastIndexOf('-'), hard.lastIndexOf(';'), hard.lastIndexOf(':'));
  let cut = boundary > 0 ? hard.slice(0, boundary) : hard;
  cut = cut.replace(/[\s,;:\-—]+$/g, '').trim();
  if (!cut) cut = hard.trim();
  if (!/[.!?]$/.test(cut)) cut = `${cut}.`;
  return cut;
}

/**
 * When no user preferences are provided, strip implied-preference language aimed at the user.
 * Keeps neutral or dog-centric facts.
 */
export function sanitizeNoPreferenceClaims(text: string): string {
  let s = String(text || '').trim();
  if (!s) return s;
  // Remove "You, as an X,"
  s = s.replace(/^you,?\s+as\s+an?\s+[^,]+,\s*/i, '');
  // Remove constructions like: you would enjoy/love/like/prefer/want/need (the) companionship of
  s = s.replace(/\byou(?:'d)?\s+(?:would\s+|will\s+|might\s+|could\s+)?(?:enjoy|love|like|prefer|want|need)\s+(?:the\s+)?(?:companionship\s+of\s+)?/gi, '');
  // Remove "for someone like you ..."
  s = s.replace(/\bfor\s+someone\s+like\s+you(?:\s+who\s+prefers[^.,!?]*)?/gi, '');
  // Remove "you who prefer ..."
  s = s.replace(/\byou\s+who\s+prefer[^.,!?]*/gi, '');
  // Remove leading filler like "that is", "who is" if sentence starts with a noun phrase
  s = s.replace(/^that\s+is\s+/i, '').replace(/^who\s+is\s+/i, '');
  // Normalize casing of initial article
  s = s.replace(/^a\s+/i, (m) => m[0] === 'A' ? m : 'A ');
  // Clean up spaces and dangling punctuation
  s = s.replace(/\s{2,}/g, ' ').replace(/^,\s*/g, '').replace(/\s*,\s*,/g, ', ').trim();
  return s;
}

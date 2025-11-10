import { FactPack } from './facts';
import { getMultiBreedTemperaments, TemperamentTrait } from './breedTemperaments';
import { Dog } from './schemas';
import { COPY_MAX } from './constants/copyLimits';

export type VerifyResult = { ok: boolean; errors: string[]; fixed: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

// Lightweight synonym support
const SYNONYMS: Record<string, string[]> = {
  'medium energy': ['moderate energy', 'moderate activity'],
  'low energy': ['calm energy', 'laid back energy', 'chill energy'],
  'quiet': ['calm', 'low noise', 'not barky'],
};

function clampToLength(text: string, max: number): string {
  let s = String(text || '').trim();
  if (!s) return s;
  if (s.length <= max) return ensureTerminalPunctuation(s);
  const hard = s.slice(0, max);
  const sentenceBoundary = Math.max(
    hard.lastIndexOf('. '),
    hard.lastIndexOf('! '),
    hard.lastIndexOf('? ')
  );
  if (sentenceBoundary > 0) {
    const sentenceCut = hard.slice(0, sentenceBoundary + 1).trim();
    if (sentenceCut) return ensureTerminalPunctuation(sentenceCut);
  }
  const boundary = Math.max(
    hard.lastIndexOf(' '),
    hard.lastIndexOf(','),
    hard.lastIndexOf('—'),
    hard.lastIndexOf('-'),
    hard.lastIndexOf(';'),
    hard.lastIndexOf(':')
  );
  let cut = boundary > 0 ? hard.slice(0, boundary) : hard;
  cut = cut.replace(/[\s,;:\-—]+$/g, '').trim();
  if (!cut) cut = hard.trim();
  return ensureTerminalPunctuation(cut);
}

function ensureTerminalPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

/**
 * Verify temperament claims are properly labeled as proven vs likely
 */
export function verifyTemperamentClaims(text: string, dog: Dog, facts: FactPack): { errors: string[]; fixed: string } {
  let fixed = text;
  const errors: string[] = [];
  
  const breedTemperaments = getMultiBreedTemperaments(dog.breeds);
  
  // Check for temperament traits mentioned in the text
  const temperamentTraits: TemperamentTrait[] = [
    "eager-to-please", "intelligent", "focused", "adaptable", "independent-thinker",
    "loyal", "protective", "confident", "gentle", "sensitive",
    "playful", "calm-indoors", "alert-watchful", "quiet", "companion-driven"
  ];
  
  for (const trait of temperamentTraits) {
    const traitDisplay = trait.replace(/-/g, ' ');
    const isProven = dog.temperament?.includes(trait) || false;
    const breedPrior = (breedTemperaments[trait] || 0) / 3;
    const isLikely = !isProven && breedPrior >= 0.67;
    
    // Check if trait is mentioned in text
    const traitRegex = new RegExp(`\\b${traitDisplay.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (traitRegex.test(text)) {
      if (isProven) {
        // Should use definitive phrasing
        const definitivePhrases = [
          `is ${traitDisplay}`,
          `${traitDisplay} dog`,
          `has ${traitDisplay} nature`
        ];
        const hasDefinitive = definitivePhrases.some(phrase => 
          new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
        );
        
        if (!hasDefinitive) {
          const tendencyPhrase = `tends to be ${traitDisplay}`;
          if (text.includes(tendencyPhrase)) {
            errors.push(`Temperament claim "${traitDisplay}" should be definitive (proven), not tentative`);
            fixed = fixed.replace(new RegExp(`\\b${tendencyPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), `is ${traitDisplay}`);
          }
        }
      } else if (isLikely) {
        // Should use tendency phrasing
        const tendencyPhrases = [
          `tends to be ${traitDisplay}`,
          `typically ${traitDisplay}`,
          `generally ${traitDisplay}`
        ];
        const hasTendency = tendencyPhrases.some(phrase => 
          new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
        );
        
        if (!hasTendency) {
          const definitivePhrase = `is ${traitDisplay}`;
          if (text.includes(definitivePhrase)) {
            errors.push(`Temperament claim "${traitDisplay}" should be tentative (breed prior), not definitive`);
            fixed = fixed.replace(new RegExp(`\\b${definitivePhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), `tends to be ${traitDisplay}`);
          }
        }
      }
    }
  }
  
  return { errors, fixed };
}

export function verifyBlurb(text: string, facts: FactPack, {
  minPrefHit = 1,
  lengthCap = COPY_MAX.TOP,
}: { minPrefHit?: number; lengthCap?: number } = {}): VerifyResult {
  const original = (text || '').trim();
  let s = norm(original);

  // Build preference set including synonyms
  const prefsSet = new Set<string>();
  for (const p of facts.prefs.map(norm)) {
    if (!p) continue;
    prefsSet.add(p);
    // attach synonyms mapped to canonical phrases where appropriate
    for (const [canonical, syns] of Object.entries(SYNONYMS)) {
      const cn = norm(canonical);
      if (p === cn) {
        for (const syn of syns) prefsSet.add(norm(syn));
      }
    }
  }
  const traitsSet = new Set(facts.dogTraits.map(norm));

  const errors: string[] = [];

  // 1) Must reference ≥1 user/guidance preference when any exist
  const hasPrefs = prefsSet.size > 0;
  const prefHit = hasPrefs ? [...prefsSet].some(p => p.length > 0 && s.includes(p)) : true;
  if (hasPrefs && !prefHit && minPrefHit > 0) {
    errors.push('No explicit reference to a user/guidance preference.');
  }

  // 1b) When no preferences exist, forbid preference language
  if (!hasPrefs) {
    const preferencePhrases = [
      /\byour\s+preferences?\b/,
      /\byour\s+desires?\b/,
      /\byour\s+wants?\b/,
      /\byour\s+needs?\b/,
      /\byour\s+requirements?\b/,
      /\byou\s+(prefer|want|like|need)\b/,
      /\bmatches\s+your\b/,
      /\bfits\s+your\b/,
    ];
    const violates = preferencePhrases.some(re => re.test(original.toLowerCase()));
    if (violates) {
      errors.push('Preference language present with no preferences provided.');
    }
  }

  // 2) Detect banned terms unless justified by facts
  for (const b of facts.banned) {
    const bn = norm(b);
    if (bn && s.includes(bn) && !prefsSet.has(bn) && !traitsSet.has(bn)) {
      errors.push(`Banned or unsupported term: ${b}`);
    }
  }

  // 3) Simple risky claims scan
  const whitelist = new Set<string>([
    ...prefsSet,
    ...traitsSet,
    'dog','fit','match','energy','friendly','young','adult','senior','small','medium','large','xl','kid-friendly','cat-friendly','quiet','low maintenance'
  ]);
  const risky = ['service', 'therapy', 'purebred', 'certified', 'house trained', 'crate trained', 'rare', 'papered'];
  for (const r of risky) {
    const rn = norm(r);
    if (rn && s.includes(rn)) {
      const justified = [...whitelist].some(w => w && s.includes(w));
      if (!justified) errors.push(`Unsupported claim: ${r}`);
    }
  }

  if (errors.length === 0) {
    // Enforce length cap softly. Keep cited preference intact.
    const capped = clampToLength(original, lengthCap);
    if (process.env.DEBUG_REASONING === '1') {
      // eslint-disable-next-line no-console
      console.log('[verify] OK. before:', original, 'after:', capped);
    }
    return { ok: true, errors: [], fixed: capped };
  }

  // Minimal fixups
  let fixed = original;

  // Append a short clause citing one preference if missing
  if (hasPrefs && !prefHit) {
    const firstPref = [...prefsSet][0];
    if (firstPref) {
      const add = ` Matches your ${firstPref}.`;
      fixed = (fixed + add).slice(0, lengthCap);
    }
  }

  // Strip truly banned tokens that aren't in prefs/traits
  for (const b of facts.banned) {
    const bn = norm(b);
    if (!prefsSet.has(bn) && !traitsSet.has(bn)) {
      const re = new RegExp(b, 'ig');
      fixed = fixed.replace(re, '').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // If no prefs, strip preference language deterministically
  if (!hasPrefs) {
    fixed = fixed
      .replace(/\bmatches\s+your\b/gi, 'matches')
      .replace(/\bfits\s+your\b/gi, 'fits')
      .replace(/\byour\s+preferences?\b[^,.!?]*/gi, '')
      .replace(/\byour\s+desires?\b[^,.!?]*/gi, '')
      .replace(/\byour\s+wants?\b[^,.!?]*/gi, '')
      .replace(/\byour\s+needs?\b[^,.!?]*/gi, '')
      .replace(/\byour\s+requirements?\b[^,.!?]*/gi, '')
      .replace(/\byou\s+(prefer|want|like|need)\b[^,.!?]*/gi, 'you')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Re-truncate (avoid cutting right after appended preference token when possible)
  if (fixed.length > lengthCap) {
    fixed = clampToLength(fixed, lengthCap);
  }

  if (process.env.DEBUG_REASONING === '1') {
    // eslint-disable-next-line no-console
    console.log('[verify] ERRORS:', errors, 'before:', original, 'after:', fixed);
  }

  return { ok: false, errors, fixed };
}

// Enhanced verification: enforce size citation and strip UI terms
export function verifyBlurbWithFacets(text: string, facts: FactPack): VerifyResult {
  const base = verifyBlurb(text, facts, { lengthCap: COPY_MAX.TOP });
  let fixed = base.fixed;
  const errors = [...base.errors];

  const s = norm(fixed);
  const hasSizePref = facts.prefs.some(p => ['small','medium','large','xl'].includes(norm(p)));
  const dogHasSize = facts.dogTraits.some(t => ['small','medium','large','xl'].includes(norm(t)));
  const sizeTokens = ['small','medium','large','xl'];
  const mentionsSize = sizeTokens.some(tok => s.includes(tok));
  if (hasSizePref && dogHasSize && !mentionsSize) {
    errors.push('Size preference matched but not cited.');
    const dogSize = (facts.dogTraits.find(t => sizeTokens.includes(norm(t))) || '').toLowerCase();
    if (dogSize) fixed = `${fixed} ${dogSize.charAt(0).toUpperCase()}${dogSize.slice(1)} size fits.`.trim();
  }

  // Strip UI/internal terms
  const uiTerms = [/\bincluded breeds\b/gi, /\bfilters?\b/gi, /\bselected\s+filters?\b/gi];
  for (const re of uiTerms) {
    if (re.test(fixed)) {
      fixed = fixed.replace(re, '').replace(/\s{2,}/g, ' ').trim();
      errors.push('Removed UI term.');
    }
  }

  // Final cap
  if (fixed.length > COPY_MAX.TOP) fixed = fixed.slice(0, COPY_MAX.TOP);

  return { ok: errors.length === 0, errors, fixed };
}

/**
 * Enhanced verification with temperament claim checking
 */
export function verifyBlurbWithTemperament(text: string, facts: FactPack, dog: Dog, {
  minPrefHit = 1,
  lengthCap = COPY_MAX.TOP,
}: { minPrefHit?: number; lengthCap?: number } = {}): VerifyResult {
  // First run standard verification
  const baseResult = verifyBlurb(text, facts, { minPrefHit, lengthCap });
  
  // Then check temperament claims
  const tempResult = verifyTemperamentClaims(baseResult.fixed, dog, facts);
  
  const allErrors = [...baseResult.errors, ...tempResult.errors];
  
  return {
    ok: allErrors.length === 0,
    errors: allErrors,
    fixed: tempResult.fixed
  };
}



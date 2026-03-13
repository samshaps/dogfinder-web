import type { NormPrefs } from '@/app/api/normalize-guidance/route';

/**
 * Type 1: Detect contradictions purely from explicit form field selections.
 * Runs synchronously on submit — no API call needed.
 */
export function detectExplicitContradictions(
  energy: string,
  temperament: string[]
): string[] {
  const warnings: string[] = [];

  if (energy === 'high') {
    if (temperament.includes('calm-indoors')) {
      warnings.push(
        "You've selected High energy but also want a dog that's calm indoors. High-energy dogs typically need lots of daily activity and can be restless inside."
      );
    }
    if (temperament.includes('quiet')) {
      warnings.push(
        "High-energy dogs tend to be more vocal and active — this may conflict with your preference for a quiet dog."
      );
    }
  }

  if (energy === 'low' && temperament.includes('playful')) {
    warnings.push(
      "Low-energy dogs are often less playful than medium- or high-energy ones. You may see fewer of the playful behaviors you're looking for."
    );
  }

  return warnings;
}

/**
 * Type 2: Detect contradictions between explicit form selections and AI-parsed guidance (NormPrefs).
 * Runs after calling /api/normalize-guidance when guidance text is present.
 */
export function detectGuidanceContradictions(
  energy: string,
  size: string[],
  normPrefs: NormPrefs
): string[] {
  const warnings: string[] = [];
  const notesText = (normPrefs.notes ?? []).join(' ').toLowerCase();
  const normTemperament = (normPrefs.temperament ?? []).map(t => t.toLowerCase());

  // high energy + low-maintenance lifestyle signals in guidance
  if (energy === 'high') {
    const lowMaintKeywords = [
      'low maintenance', 'low-maintenance', 'easy', 'low-key', 'low key',
      'chill', 'laid-back', 'laid back', 'relaxed', 'easygoing'
    ];
    if (lowMaintKeywords.some(kw => notesText.includes(kw))) {
      warnings.push(
        "You've selected High energy but your lifestyle description suggests you're looking for something low-maintenance. High-energy dogs typically need 2+ hours of daily activity."
      );
    }
  }

  // low energy + active lifestyle signals in guidance
  if (energy === 'low') {
    const activeKeywords = [
      'jogging', 'running', 'run', 'hike', 'hiking', 'active', 'outdoor',
      'athletic', 'marathon', 'cycling', 'bike'
    ];
    if (
      activeKeywords.some(kw => notesText.includes(kw)) ||
      normTemperament.some(t => ['playful', 'energetic', 'active'].includes(t))
    ) {
      warnings.push(
        "Your lifestyle sounds quite active, but you've selected Low energy. You might find a low-energy dog can't keep up with your pace."
      );
    }
  }

  // small-only size + guard/protection signals in guidance
  const smallOnly = size.length > 0 && size.every(s => s === 'small');
  if (smallOnly) {
    const guardKeywords = ['guard', 'protection', 'security', 'working dog', 'working breed'];
    if (
      guardKeywords.some(kw => notesText.includes(kw)) ||
      normTemperament.some(t => guardKeywords.some(kw => t.includes(kw)))
    ) {
      warnings.push(
        "Guard and protection roles are more common in medium-to-large breeds — small dogs fitting this profile may be limited."
      );
    }
  }

  // high energy + apartment/no-yard signals in guidance
  if (energy === 'high') {
    const apartmentKeywords = ['apartment', 'condo', 'no yard', 'studio', 'small space'];
    if (apartmentKeywords.some(kw => notesText.includes(kw))) {
      warnings.push(
        "High-energy dogs in apartments can be challenging — they typically need outdoor space and vigorous daily exercise beyond short walks."
      );
    }
  }

  return warnings;
}

/**
 * Detect internal contradictions within NormPrefs itself.
 * Used by the normalize-guidance route to annotate its own response.
 */
export function detectNormPrefsContradictions(normPrefs: NormPrefs): string[] {
  if (!normPrefs.energy) return [];
  return detectGuidanceContradictions(
    normPrefs.energy,
    normPrefs.size ?? [],
    normPrefs
  );
}

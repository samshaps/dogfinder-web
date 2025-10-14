import { UserPreferences, EffectivePreferences, Origin, FieldWithOrigin } from './schemas';
import { expandUserBreedsV2 } from '@/utils/breedFuzzy';
import { tokenizeGuidance, extractGuidanceHints } from '@/utils/guidance';

/**
 * Normalization Layer
 * Converts raw UserPreferences to EffectivePreferences with origin tracking
 */

export function normalizeUserPreferences(prefs: UserPreferences): EffectivePreferences {
  const guidance = tokenizeGuidance(prefs.guidance);
  const hints = extractGuidanceHints(prefs.guidance);
  
  // Breed expansion with notes
  const includeExpansion = expandUserBreedsV2(prefs.breedsInclude || []);
  const excludeExpansion = expandUserBreedsV2(prefs.breedsExclude || []);
  
  // Age normalization
  const ageFromUser = prefs.age || [];
  const ageFromGuidance = hints.ageHints.filter(a => 
    ['baby', 'young', 'adult', 'senior'].includes(a)
  ) as ("baby"|"young"|"adult"|"senior")[];
  const ageValue = [...new Set([...ageFromUser, ...ageFromGuidance])] as ("baby"|"young"|"adult"|"senior")[];
  const ageOrigin: Origin = ageFromUser.length > 0 ? "user" : (ageFromGuidance.length > 0 ? "guidance" : "default");
  
  // Size normalization with XL support
  const sizeFromUser = prefs.size || [];
  const sizeFromGuidance = hints.sizeHints
    .filter(s => s !== "apartment-sized" && ['small', 'medium', 'large', 'xl'].includes(s))
    .map(s => s === 'xl' ? 'xl' : s) as ("small"|"medium"|"large"|"xl")[];
  const sizeValue = [...new Set([...sizeFromUser, ...sizeFromGuidance])] as ("small"|"medium"|"large"|"xl")[];
  const sizeOrigin: Origin = sizeFromUser.length > 0 ? "user" : (sizeFromGuidance.length > 0 ? "guidance" : "default");
  
  
  // Energy normalization
  const energyFromUser = prefs.energy;
  const energyFromGuidance = hints.energyHints[0]; // Take first energy hint
  const energyValue = energyFromUser || energyFromGuidance;
  const energyOrigin: Origin = energyFromUser ? "user" : (energyFromGuidance ? "guidance" : "default");
  
  // Temperament normalization
  const tempFromUser = prefs.temperament || [];
  const tempFromGuidance = hints.temperamentHints;
  const tempValue = [...new Set([...tempFromUser, ...tempFromGuidance])];
  const tempOrigin: Origin = tempFromUser.length > 0 ? "user" : (tempFromGuidance.length > 0 ? "guidance" : "default");
  
  // Flags extraction
  const flags = {
    lowMaintenance: guidance.flags.lowMaintenance,
    firstTimeOwner: guidance.flags.firstTimeOwner,
    apartmentOk: guidance.flags.apartmentOk,
    quietPreferred: guidance.flags.quietPreferred,
    kidFriendly: guidance.flags.kidFriendly,
    catFriendly: guidance.flags.catFriendly,
  };
  
  // Remove undefined flags
  Object.keys(flags).forEach(key => {
    if (flags[key as keyof typeof flags] === undefined) {
      delete flags[key as keyof typeof flags];
    }
  });
  
  return {
    zipCodes: prefs.zipCodes,
    radiusMi: prefs.radiusMi,
    breeds: {
      include: prefs.breedsInclude || [],
      exclude: prefs.breedsExclude || [],
      expandedInclude: includeExpansion.expanded,
      expandedExclude: excludeExpansion.expanded,
      notes: [...includeExpansion.notes, ...excludeExpansion.notes],
      origin: (prefs.breedsInclude && prefs.breedsInclude.length > 0) ? "user" : "default"
    },
    age: { value: ageValue, origin: ageOrigin },
    size: { value: sizeValue, origin: sizeOrigin },
    energy: energyValue ? { value: energyValue as "low"|"medium"|"high", origin: energyOrigin } : undefined,
    temperament: { value: tempValue, origin: tempOrigin },
    flags
  };
}

/**
 * Helper function to get origin of a specific field
 */
export function getFieldOrigin(effectivePrefs: EffectivePreferences, field: keyof EffectivePreferences): Origin {
  switch (field) {
    case 'age':
      return effectivePrefs.age.origin;
    case 'size':
      return effectivePrefs.size.origin;
    case 'energy':
      return effectivePrefs.energy?.origin || "default";
    case 'temperament':
      return effectivePrefs.temperament.origin;
    case 'breeds':
      return effectivePrefs.breeds.origin;
    default:
      return "default";
  }
}

/**
 * Helper function to check if a field has user-selected values (not just defaults)
 */
export function hasUserSelection(effectivePrefs: EffectivePreferences, field: keyof EffectivePreferences): boolean {
  return getFieldOrigin(effectivePrefs, field) === "user";
}

/**
 * Helper function to check if a field has guidance-derived values
 */
export function hasGuidanceSelection(effectivePrefs: EffectivePreferences, field: keyof EffectivePreferences): boolean {
  return getFieldOrigin(effectivePrefs, field) === "guidance";
}

/**
 * Helper function to get all expansion notes
 */
export function getExpansionNotes(effectivePrefs: EffectivePreferences): string[] {
  return effectivePrefs.breeds.notes;
}

import { describe, it, expect, vi } from 'vitest';
import { generateTop3Reasoning, generateAllMatchesReasoning } from '../lib/explanation';
import { buildFactPack } from '../lib/facts';
import { verifyBlurb } from '../lib/verify';

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('end-to-end generation with verification', () => {
  const dog = {
    id: '1', name: 'Buddy', breeds: ['Mixed'], age: 'adult', size: 'medium', energy: 'medium',
    temperament: ['kid-friendly'], location: { zip: '10001' }
  } as any;

  const analysis = {
    dogId: '1', score: 90, matchedPrefs: ['medium energy', 'quiet'], unmetPrefs: [], reasons: {}
  } as any;

  const effectivePrefs = {
    zipCodes: ['10001'], radiusMi: 50,
    breeds: { include: [], exclude: [], expandedInclude: [], expandedExclude: [], notes: [], origin: 'user' },
    age: { value: [], origin: 'default' },
    size: { value: [], origin: 'default' },
    temperament: { value: ['quiet'], origin: 'user' },
    flags: { quietPreferred: true }
  } as any;

  it('adds pref patch if free-form lacks explicit preference', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reasoning: 'Kid-friendly dog with moderate energy for a calm home.' }) });
    const result = await generateTop3Reasoning(dog, analysis, effectivePrefs);
    expect(result.primary.length).toBeGreaterThan(0);
  });

  it('All Matches returns empty string (no AI)', async () => {
    const blurb = await generateAllMatchesReasoning(dog, analysis, effectivePrefs);
    expect(blurb).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { UserPreferences, Dog } from '@/lib/schemas';
import { expandUserBreeds, breedHit } from '@/utils/breedFuzzy';
import { tokenizeGuidance, extractGuidanceHints } from '@/utils/guidance';
import { normalizeUserPreferences } from '@/lib/normalization';
import { filterByRadius, filterByBreeds, applyFilters } from '@/lib/filtering';
import { scoreDog, sortDogsByScore } from '@/lib/scoring';
import { processDogMatchingSync } from '@/lib/matching-flow';

describe('Breed Fuzzy Matching', () => {
  it('should expand doodle terms correctly', () => {
    const result = expandUserBreeds(['doodles']);
    expect(result.expanded).toContain('goldendoodle');
    expect(result.expanded).toContain('labradoodle');
    expect(result.expanded).toContain('poodle mix');
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('should handle breed hit matching', () => {
    const dogBreeds = ['Goldendoodle', 'Mixed Breed'];
    const expanded = ['goldendoodle', 'labradoodle', 'poodle'];
    
    expect(breedHit(dogBreeds, expanded)).toBe(true);
    expect(breedHit(['Husky'], expanded)).toBe(false);
  });

  it('should handle case insensitive matching', () => {
    const dogBreeds = ['GOLDENDOODLE'];
    const expanded = ['goldendoodle'];
    
    expect(breedHit(dogBreeds, expanded)).toBe(true);
  });

  it('should handle hyphen variations', () => {
    const dogBreeds = ['Golden-Doodle'];
    const expanded = ['goldendoodle'];
    
    expect(breedHit(dogBreeds, expanded)).toBe(true);
  });
});

describe('Guidance Parsing', () => {
  it('should extract age hints correctly', () => {
    const guidance = 'We want a puppy or young dog';
    const hints = extractGuidanceHints(guidance);
    
    expect(hints.ageHints).toContain('puppy');
    expect(hints.ageHints).toContain('young');
  });

  it('should extract size hints correctly', () => {
    const guidance = 'We live in an apartment, so medium size would be good';
    const hints = extractGuidanceHints(guidance);
    
    expect(hints.sizeHints).toContain('medium');
    expect(hints.flagHints).toContain('apartment suitable');
  });

  it('should extract temperament hints correctly', () => {
    const guidance = 'We need hypoallergenic and quiet dog for our family with kids';
    const hints = extractGuidanceHints(guidance);
    
    expect(hints.temperamentHints).toContain('hypoallergenic');
    expect(hints.temperamentHints).toContain('quiet');
    expect(hints.temperamentHints).toContain('kid-friendly');
  });

  it('should extract flags correctly', () => {
    const guidance = 'First-time owners looking for low-maintenance dog';
    const tokens = tokenizeGuidance(guidance);
    
    expect(tokens.flags.firstTimeOwner).toBe(true);
    expect(tokens.flags.lowMaintenance).toBe(true);
  });
});

describe('Normalization', () => {
  it('should normalize user preferences with guidance', () => {
    const prefs: UserPreferences = {
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: ['doodles'],
      breedsExclude: ['husky'],
      age: ['adult'],
      size: ['medium'],
      energy: 'medium',
      temperament: ['quiet'],
      guidance: 'We need hypoallergenic dog for apartment living'
    };

    const effective = normalizeUserPreferences(prefs);
    
    expect(effective.zipCodes).toEqual(['10001']);
    expect(effective.breeds.expandedInclude).toContain('goldendoodle');
    expect(effective.temperament.value).toContain('hypoallergenic');
    expect(effective.flags.apartmentOk).toBe(true);
  });

  it('should track origins correctly', () => {
    const prefs: UserPreferences = {
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: [],
      breedsExclude: [],
      age: ['adult'],
      size: [],
      energy: undefined,
      temperament: [],
      guidance: 'We want a puppy'
    };

    const effective = normalizeUserPreferences(prefs);
    
    expect(effective.age.origin).toBe('user');
    expect(effective.size.origin).toBe('guidance');
    expect(effective.energy).toBeUndefined();
  });
});

describe('Filtering', () => {
  const sampleDogs: Dog[] = [
    {
      id: '1',
      name: 'Buddy',
      breeds: ['Goldendoodle'],
      age: 'adult',
      size: 'medium',
      energy: 'medium',
      temperament: ['quiet'],
      location: { zip: '10001', distanceMi: 10 }
    },
    {
      id: '2',
      name: 'Max',
      breeds: ['Husky'],
      age: 'young',
      size: 'large',
      energy: 'high',
      temperament: ['active'],
      location: { zip: '10002', distanceMi: 60 }
    },
    {
      id: '3',
      name: 'Luna',
      breeds: ['Poodle'],
      age: 'senior',
      size: 'small',
      energy: 'low',
      temperament: ['quiet', 'hypoallergenic'],
      location: { zip: '10003', distanceMi: 25 }
    }
  ];

  it('should filter by radius correctly', () => {
    const filtered = filterByRadius(sampleDogs, ['10001'], 50);
    
    expect(filtered).toHaveLength(2);
    expect(filtered.map(d => d.id)).toEqual(['1', '3']);
  });

  it('should filter by breeds correctly', () => {
    const effectivePrefs = normalizeUserPreferences({
      zipCodes: ['10001'],
      radiusMi: 100,
      breedsInclude: ['doodles'],
      breedsExclude: ['husky'],
      age: [],
      size: [],
      energy: undefined,
      temperament: [],
      guidance: ''
    });

    const filtered = filterByBreeds(sampleDogs, effectivePrefs);
    
    expect(filtered).toHaveLength(2);
    expect(filtered.map(d => d.id)).toEqual(['1', '3']);
  });

  it('should apply all filters correctly', () => {
    const effectivePrefs = normalizeUserPreferences({
      zipCodes: ['10001'],
      radiusMi: 30,
      breedsInclude: ['doodles'],
      breedsExclude: [],
      age: [],
      size: [],
      energy: undefined,
      temperament: [],
      guidance: ''
    });

    const filtered = applyFilters(sampleDogs, effectivePrefs);
    
    // Both Goldendoodle (id: 1) and Poodle (id: 3) should match 'doodles' expansion
    // and both are within 30 miles radius
    expect(filtered).toHaveLength(2);
    expect(filtered.map(d => d.id)).toEqual(['1', '3']);
  });
});

describe('Scoring', () => {
  const sampleDog: Dog = {
    id: '1',
    name: 'Buddy',
    breeds: ['Goldendoodle'],
    age: 'adult',
    size: 'medium',
    energy: 'medium',
    temperament: ['quiet'],
    location: { zip: '10001', distanceMi: 10 }
  };

  it('should score age matches correctly', () => {
    const effectivePrefs = normalizeUserPreferences({
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: [],
      breedsExclude: [],
      age: ['adult'],
      size: [],
      energy: undefined,
      temperament: [],
      guidance: ''
    });

    const analysis = scoreDog(sampleDog, effectivePrefs);
    
    expect(analysis.score).toBeGreaterThan(100);
    expect(analysis.matchedPrefs).toContain('adult age');
  });

  it('should score size matches correctly', () => {
    const effectivePrefs = normalizeUserPreferences({
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: [],
      breedsExclude: [],
      age: [],
      size: ['medium'],
      energy: undefined,
      temperament: [],
      guidance: ''
    });

    const analysis = scoreDog(sampleDog, effectivePrefs);
    
    expect(analysis.score).toBeGreaterThan(100);
    expect(analysis.matchedPrefs).toContain('medium size');
  });

  it('should score breed matches correctly', () => {
    const effectivePrefs = normalizeUserPreferences({
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: ['doodles'],
      breedsExclude: [],
      age: [],
      size: [],
      energy: undefined,
      temperament: [],
      guidance: ''
    });

    const analysis = scoreDog(sampleDog, effectivePrefs);
    
    expect(analysis.score).toBeGreaterThan(100);
    expect(analysis.matchedPrefs).toContain('preferred breed');
  });

  it('should apply low-maintenance penalties correctly', () => {
    const puppyDog: Dog = {
      ...sampleDog,
      age: 'baby',
      energy: 'high'
    };

    const effectivePrefs = normalizeUserPreferences({
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: [],
      breedsExclude: [],
      age: [],
      size: [],
      energy: undefined,
      temperament: [],
      guidance: 'We want low-maintenance dog'
    });

    const analysis = scoreDog(puppyDog, effectivePrefs);
    
    expect(analysis.unmetPrefs.some(p => p.includes('puppy'))).toBe(true);
  });

  it('should apply quiet preference penalties correctly', () => {
    const barkyDog: Dog = {
      ...sampleDog,
      barky: true
    };

    const effectivePrefs = normalizeUserPreferences({
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: [],
      breedsExclude: [],
      age: [],
      size: [],
      energy: undefined,
      temperament: [],
      guidance: 'We need quiet dog'
    });

    const analysis = scoreDog(barkyDog, effectivePrefs);
    
    expect(analysis.unmetPrefs.some(p => p.includes('bark'))).toBe(true);
  });

  it('should sort dogs by score correctly', () => {
    const dogs: Dog[] = [
      { ...sampleDog, id: '1', name: 'Low Score', location: { zip: '10001', distanceMi: 5 } },
      { ...sampleDog, id: '2', name: 'High Score', location: { zip: '10001', distanceMi: 10 } },
      { ...sampleDog, id: '3', name: 'Medium Score', location: { zip: '10001', distanceMi: 3 } }
    ];

    const analyses = dogs.map((dog, index) => ({
      dogId: dog.id,
      score: [80, 95, 85][index],
      matchedPrefs: ['test'],
      unmetPrefs: [],
      reasons: {}
    }));

    const { dogs: sortedDogs, analyses: sortedAnalyses } = sortDogsByScore(dogs, analyses);
    
    expect(sortedDogs[0].id).toBe('2'); // Highest score
    expect(sortedDogs[1].id).toBe('3'); // Second highest score
    expect(sortedDogs[2].id).toBe('1'); // Lowest score
  });
});

describe('Integration Tests', () => {
  const sampleDogs: Dog[] = [
    {
      id: '1',
      name: 'Buddy',
      breeds: ['Goldendoodle'],
      age: 'adult',
      size: 'medium',
      energy: 'medium',
      temperament: ['quiet'],
      location: { zip: '10001', distanceMi: 10 }
    },
    {
      id: '2',
      name: 'Max',
      breeds: ['Husky'],
      age: 'young',
      size: 'large',
      energy: 'high',
      temperament: ['active'],
      location: { zip: '10002', distanceMi: 60 }
    },
    {
      id: '3',
      name: 'Luna',
      breeds: ['Poodle'],
      age: 'senior',
      size: 'small',
      energy: 'low',
      temperament: ['quiet', 'hypoallergenic'],
      location: { zip: '10003', distanceMi: 25 }
    }
  ];

  it('should process complete matching flow', () => {
    const userPrefs: UserPreferences = {
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: ['doodles'],
      breedsExclude: ['husky'],
      age: ['adult'],
      size: ['medium'],
      energy: 'medium',
      temperament: ['quiet'],
      guidance: 'We need hypoallergenic dog for apartment living'
    };

    const results = processDogMatchingSync(userPrefs, sampleDogs);
    
    expect(results.topMatches.length).toBeLessThanOrEqual(3);
    expect(results.allMatches.length).toBeGreaterThan(0);
    expect(results.expansionNotes.length).toBeGreaterThan(0);
    
    // Should exclude husky and include only dogs within radius
    const includedIds = results.allMatches.map(m => m.dogId);
    expect(includedIds).toContain('1'); // Goldendoodle within radius
    expect(includedIds).not.toContain('2'); // Husky excluded
  });

  it('should handle empty results gracefully', () => {
    const userPrefs: UserPreferences = {
      zipCodes: ['99999'],
      radiusMi: 1,
      breedsInclude: ['nonexistent'],
      breedsExclude: [],
      age: [],
      size: [],
      energy: undefined,
      temperament: [],
      guidance: ''
    };

    const results = processDogMatchingSync(userPrefs, sampleDogs);
    
    expect(results.topMatches).toHaveLength(0);
    expect(results.allMatches).toHaveLength(0);
    expect(results.expansionNotes).toBeDefined();
  });
});

describe('XL Size Support', () => {
  it('should handle XL size correctly in normalization', () => {
    const prefs: UserPreferences = {
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: [],
      breedsExclude: [],
      age: [],
      size: ['xl'],
      energy: undefined,
      temperament: [],
      guidance: ''
    };

    const effective = normalizeUserPreferences(prefs);
    expect(effective.size.value).toContain('xl');
  });

  it('should score XL size matches correctly', () => {
    const xlDog: Dog = {
      id: '1',
      name: 'Giant',
      breeds: ['Great Dane'],
      age: 'adult',
      size: 'xl',
      energy: 'low',
      temperament: ['gentle'],
      location: { zip: '10001', distanceMi: 10 }
    };

    const effectivePrefs = normalizeUserPreferences({
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: [],
      breedsExclude: [],
      age: [],
      size: ['xl'],
      energy: undefined,
      temperament: [],
      guidance: ''
    });

    const analysis = scoreDog(xlDog, effectivePrefs);
    expect(analysis.matchedPrefs).toContain('xl size');
  });
});

describe('No Default Leakage', () => {
  it('should not claim defaults as user preferences', () => {
    const prefs: UserPreferences = {
      zipCodes: ['10001'],
      radiusMi: 50,
      breedsInclude: [],
      breedsExclude: [],
      age: [], // No age selected
      size: [], // No size selected
      energy: undefined,
      temperament: [],
      guidance: ''
    };

    const effective = normalizeUserPreferences(prefs);
    
    // Age and size should be empty arrays, not default values
    expect(effective.age.value).toHaveLength(0);
    expect(effective.size.value).toHaveLength(0);
    expect(effective.age.origin).toBe('default');
    expect(effective.size.origin).toBe('default');
  });
});

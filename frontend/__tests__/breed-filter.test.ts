import { describe, it, expect } from 'vitest';
import { dogBreedHit, expandUserBreedsV2 } from '../utils/breedFuzzy';
import { passesBreedFilter } from '../lib/filtering';
import { Dog, EffectivePreferences } from '../lib/schemas';

// Helper to build a minimal Dog fixture
function makeDog(breeds: string[]): Dog {
  return {
    id: 'test-dog',
    name: 'Test Dog',
    breeds,
    age: 'adult',
    size: 'large',
    energy: 'medium',
    temperament: [],
    location: { zip: '10001' },
  };
}

// Helper to build EffectivePreferences with just breed include/exclude
function makePrefs(
  expandedInclude: string[],
  expandedExclude: string[]
): EffectivePreferences {
  return {
    zipCodes: ['10001'],
    radiusMi: 50,
    breeds: {
      include: [],
      exclude: [],
      expandedInclude,
      expandedExclude,
      notes: [],
      origin: 'user',
    },
    age: { value: [], origin: 'user' },
    size: { value: [], origin: 'user' },
    temperament: { value: [], origin: 'user' },
    flags: {},
  };
}

describe('breed filter scenarios', () => {
  // AC #1: Include ["lab"] → "Labrador Retriever" → passes
  // "lab" normalizeQueryV2 → "labrador", SYNONYMS_V2["labrador"] → "labrador retriever"
  // dogBreedHit tier 1 exact: "labrador retriever" === "labrador retriever" ✓
  it('AC1: include ["lab"] → dog "Labrador Retriever" → passes', () => {
    const expansion = expandUserBreedsV2(['lab']);
    // After normalizeQueryV2, "lab" → "labrador"; SYNONYMS_V2["labrador"] → "labrador retriever"
    expect(expansion.expanded).toContain('labrador retriever');

    const dog = makeDog(['Labrador Retriever']);
    const prefs = makePrefs(expansion.expanded, []);
    expect(passesBreedFilter(dog, prefs)).toBe(true);
  });

  // AC #2: Exclude ["poodle"] → "Goldendoodle" → blocked (family match, tier 3)
  // BREED_FAMILIES_V2["poodle"] includes "goldendoodle" → tier 3 hit
  it('AC2: exclude ["poodle"] → dog "Goldendoodle" → blocked', () => {
    const expansion = expandUserBreedsV2(['poodle']);
    expect(expansion.expanded).toContain('poodle');

    const dog = makeDog(['Goldendoodle']);
    const prefs = makePrefs([], expansion.expanded);
    expect(passesBreedFilter(dog, prefs)).toBe(false);
  });

  // AC #3: Include ["golden retriever"], Exclude ["poodle"] → dog "Golden Retriever, Poodle" → blocked
  // exclude takes precedence; "poodle" is in dog breeds → tier 1 exact hit → excluded
  it('AC3: include ["golden retriever"] + exclude ["poodle"] → dog ["Golden Retriever","Poodle"] → blocked', () => {
    const includeExpansion = expandUserBreedsV2(['golden retriever']);
    const excludeExpansion = expandUserBreedsV2(['poodle']);

    const dog = makeDog(['Golden Retriever', 'Poodle']);
    const prefs = makePrefs(includeExpansion.expanded, excludeExpansion.expanded);
    expect(passesBreedFilter(dog, prefs)).toBe(false);
  });

  // AC #4: Empty include + empty exclude → any dog breed → passes
  it('AC4: empty include + empty exclude → any breed → passes', () => {
    const dog = makeDog(['Some Random Breed']);
    const prefs = makePrefs([], []);
    expect(passesBreedFilter(dog, prefs)).toBe(true);
  });

  // AC #5: Include ["husky"] → "Siberian Husky" → passes (family match, tier 3)
  // BREED_FAMILIES_V2["husky"] = ["siberian husky","husky","alaskan malamute"]
  // dogBreedHit tier 3: fam includes "siberian husky" → hit
  it('AC5: include ["husky"] → dog "Siberian Husky" → passes', () => {
    const expansion = expandUserBreedsV2(['husky']);
    expect(expansion.expanded).toContain('husky');

    const dog = makeDog(['Siberian Husky']);
    const prefs = makePrefs(expansion.expanded, []);
    expect(passesBreedFilter(dog, prefs)).toBe(true);
  });

  // Direct dogBreedHit unit tests for the two fixed bugs
  describe('dogBreedHit unit tests', () => {
    it('Bug A fix: "labrador retriever" in expanded matches dog "Labrador Retriever" at tier 1 (exact)', () => {
      const result = dogBreedHit(makeDog(['Labrador Retriever']), ['labrador retriever']);
      expect(result.hit).toBe(true);
      expect(result.tier).toBe(1);
    });

    it('Bug B fix: "husky" in expanded matches dog "Siberian Husky" at tier 3 (family)', () => {
      const result = dogBreedHit(makeDog(['Siberian Husky']), ['husky']);
      expect(result.hit).toBe(true);
      expect(result.tier).toBe(3);
    });

    it('Scenario 2 verification: "poodle" in expanded matches dog "Goldendoodle" at tier 3 (family)', () => {
      const result = dogBreedHit(makeDog(['Goldendoodle']), ['poodle']);
      expect(result.hit).toBe(true);
      expect(result.tier).toBe(3);
    });

    it('Scenario 4 verification: empty expanded → no-filter result (hit=true, tier=99)', () => {
      const result = dogBreedHit(makeDog(['Any Breed']), []);
      expect(result.hit).toBe(true);
      expect(result.tier).toBe(99);
    });
  });
});

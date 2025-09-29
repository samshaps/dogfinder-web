// Unit tests for deterministic dog matching logic

import { buildAnalysis, deriveFeatures, Dog, UserPreferences } from '@/utils/matching';

// Test data
const createTestDog = (overrides: Partial<Dog> = {}): Dog => ({
  id: '1',
  name: 'Test Dog',
  breeds: ['Mixed'],
  age: 'Adult',
  size: 'Medium',
  gender: 'Male',
  photos: ['photo1.jpg'],
  publishedAt: '2024-01-01',
  location: { city: 'Test City', state: 'TS', distanceMi: 10 },
  tags: [],
  url: 'https://example.com',
  shelter: { name: 'Test Shelter', email: 'test@example.com', phone: '555-1234' },
  ...overrides
});

describe('deriveFeatures', () => {
  test('identifies hypoallergenic breeds correctly', () => {
    const poodle = createTestDog({ breeds: ['Poodle'] });
    const features = deriveFeatures(poodle);
    expect(features.hypoClaim).toBe(true);
    expect(features.shedHigh).toBe(false);
  });

  test('identifies heavy shedding breeds correctly', () => {
    const golden = createTestDog({ breeds: ['Golden Retriever'] });
    const features = deriveFeatures(golden);
    expect(features.hypoClaim).toBe(false);
    expect(features.shedHigh).toBe(true);
  });

  test('identifies puppies correctly', () => {
    const puppy = createTestDog({ age: 'Baby' });
    const features = deriveFeatures(puppy);
    expect(features.isPuppy).toBe(true);
  });

  test('identifies barky breeds correctly', () => {
    const beagle = createTestDog({ breeds: ['Beagle'] });
    const features = deriveFeatures(beagle);
    expect(features.barky).toBe(true);
  });
});

describe('buildAnalysis - Hypoallergenic preference', () => {
  const hypoPrefs: UserPreferences = { temperament: ['hypoallergenic'] };

  test('Poodle scores high for hypoallergenic preference', () => {
    const poodle = createTestDog({ breeds: ['Poodle'] });
    const analysis = buildAnalysis(poodle, hypoPrefs);
    expect(analysis.score).toBeGreaterThanOrEqual(75);
    expect(analysis.matches).toContain('Hypoallergenic');
    expect(analysis.matchedPrefs).toContainEqual({ key: 'temperament', label: 'hypoallergenic' });
    expect(analysis.unmetPrefs).not.toContainEqual({ key: 'temperament', label: 'hypoallergenic' });
  });

  test('Golden Retriever scores low for hypoallergenic preference', () => {
    const golden = createTestDog({ breeds: ['Golden Retriever'] });
    const analysis = buildAnalysis(golden, hypoPrefs);
    expect(analysis.score).toBeLessThanOrEqual(50);
    expect(analysis.mismatches).toContain('Not hypoallergenic');
    expect(analysis.mismatches).toContain('Heavy shedding vs allergy concern');
    expect(analysis.unmetPrefs).toContainEqual({ key: 'temperament', label: 'hypoallergenic' });
  });

  test('Great Pyrenees scores low for hypoallergenic preference', () => {
    const pyr = createTestDog({ breeds: ['Great Pyrenees'] });
    const analysis = buildAnalysis(pyr, hypoPrefs);
    expect(analysis.score).toBeLessThanOrEqual(50);
    expect(analysis.mismatches).toContain('Not hypoallergenic');
    expect(analysis.mismatches).toContain('Heavy shedding vs allergy concern');
    expect(analysis.unmetPrefs).toContainEqual({ key: 'temperament', label: 'hypoallergenic' });
  });
});

describe('buildAnalysis - Low-maintenance preference', () => {
  const lowMaintPrefs: UserPreferences = { 
    guidance: 'I want a low-maintenance dog for my retired lifestyle' 
  };

  test('Adult Shih Tzu scores high for low-maintenance', () => {
    const shihTzu = createTestDog({ 
      breeds: ['Shih Tzu'], 
      age: 'Adult',
      tags: ['calm', 'gentle']
    });
    const analysis = buildAnalysis(shihTzu, lowMaintPrefs);
    expect(analysis.score).toBeGreaterThanOrEqual(75);
  });

  test('Puppy scores lower for low-maintenance', () => {
    const puppy = createTestDog({ 
      breeds: ['Shih Tzu'], 
      age: 'Baby' 
    });
    const analysis = buildAnalysis(puppy, lowMaintPrefs);
    expect(analysis.mismatches).toContain('Not low-maintenance (puppy/energy/grooming)');
  });

  test('High-energy breed scores lower for low-maintenance', () => {
    const borderCollie = createTestDog({ 
      breeds: ['Border Collie'], 
      age: 'Adult' 
    });
    const analysis = buildAnalysis(borderCollie, lowMaintPrefs);
    expect(analysis.mismatches).toContain('Not low-maintenance (puppy/energy/grooming)');
  });
});

describe('buildAnalysis - Quiet apartment preference', () => {
  const quietPrefs: UserPreferences = { 
    temperament: ['quiet'],
    guidance: 'I live in an apartment and need a quiet dog'
  };

  test('Quiet small breed scores high', () => {
    const shihTzu = createTestDog({ 
      breeds: ['Shih Tzu'], 
      size: 'Small',
      tags: ['quiet', 'calm']
    });
    const analysis = buildAnalysis(shihTzu, quietPrefs);
    expect(analysis.score).toBeGreaterThanOrEqual(75);
  });

  test('Barky breed gets penalty', () => {
    const beagle = createTestDog({ 
      breeds: ['Beagle'], 
      size: 'Medium' 
    });
    const analysis = buildAnalysis(beagle, quietPrefs);
    expect(analysis.mismatches).toContain('Tends to be vocal');
  });
});

describe('buildAnalysis - Excluded breeds', () => {
  const excludePrefs: UserPreferences = { 
    excludeBreeds: ['Labrador', 'Golden Retriever'] 
  };

  test('Excluded breed gets score 0', () => {
    const lab = createTestDog({ breeds: ['Labrador Retriever'] });
    const analysis = buildAnalysis(lab, excludePrefs);
    expect(analysis.score).toBe(0);
    expect(analysis.mismatches).toContain('Excluded breed');
    expect(analysis.unmetPrefs).toContainEqual({ key: 'breeds', label: 'Labrador Retriever' });
  });

  test('Non-excluded breed scores normally', () => {
    const poodle = createTestDog({ breeds: ['Poodle'] });
    const analysis = buildAnalysis(poodle, excludePrefs);
    expect(analysis.score).toBe(100);
  });
});

describe('buildAnalysis - Age and size preferences', () => {
  test('Matching age and size score high', () => {
    const dog = createTestDog({ age: 'Adult', size: 'Medium' });
    const prefs: UserPreferences = { age: ['Adult'], size: ['Medium'] };
    const analysis = buildAnalysis(dog, prefs);
    expect(analysis.score).toBe(100);
    expect(analysis.matches).toContain('Adult matches preferred age');
    expect(analysis.matches).toContain('Medium is within your preferences');
    expect(analysis.matchedPrefs).toContainEqual({ key: 'age', label: 'Adult' });
    expect(analysis.matchedPrefs).toContainEqual({ key: 'size', label: 'Medium size fits your needs' });
  });

  test('Non-matching age and size get penalties', () => {
    const dog = createTestDog({ age: 'Baby', size: 'Large' });
    const prefs: UserPreferences = { age: ['Adult'], size: ['Small'] };
    const analysis = buildAnalysis(dog, prefs);
    expect(analysis.score).toBe(70); // 100 - 15 - 15
    expect(analysis.mismatches).toContain('Age Baby not in Adult');
    expect(analysis.mismatches).toContain('Size Large not in Small');
    expect(analysis.unmetPrefs).toContainEqual({ key: 'age', label: 'not Adult' });
    expect(analysis.unmetPrefs).toContainEqual({ key: 'size', label: 'Dog is Large; you selected Small' });
  });
});

describe('buildAnalysis - Guidance expansion', () => {
  const mkDog = (overrides: Partial<Dog> = {}): Dog => ({
    id: 'gd1',
    name: 'Guidance Dog',
    breeds: ['Mixed'],
    age: 'Adult',
    size: 'Medium',
    gender: 'Male',
    photos: ['photo.jpg'],
    publishedAt: '2024-01-01',
    location: { city: 'City', state: 'ST', distanceMi: 5 },
    tags: [],
    url: '#',
    shelter: { name: 'Shelter', email: 'a@b.com', phone: '555' },
    ...overrides
  });

  test('size expanded by guidance', () => {
    const prefs: UserPreferences = { size: ['small'], guidance: "We'd like a medium dog" };
    const dog = mkDog({ size: 'Medium' });
    const a = buildAnalysis(dog, prefs);
    expect(a.matchedPrefs.some(p => p.key === 'size')).toBe(true);
    expect(a.unmetPrefs.some(p => p.key === 'size')).toBe(false);
    expect((a.expansions || []).join(' ')).toMatch(/Expanded size.*medium/i);
  });

  test('energy OR via guidance', () => {
    const prefs: UserPreferences = { energy: 'low', guidance: 'we are active hikers' };
    const dog = mkDog({ age: 'Adult', tags: ['energetic'] });
    const a = buildAnalysis(dog, prefs);
    expect(a.matchedPrefs.some(p => p.key === 'energy')).toBe(true);
    expect(a.mismatches.join(' ')).not.toMatch(/Energy/);
  });

  test('exclude breeds still excludes', () => {
    const prefs: UserPreferences = { size: ['small'], guidance: 'medium ok', excludeBreeds: ['yorkshire'] } as any;
    const dog = mkDog({ breeds: ['Yorkshire Terrier'], size: 'Medium' });
    const a = buildAnalysis(dog, prefs);
    expect(a.score).toBe(0);
    expect(a.mismatches).toContain('Excluded breed');
  });
});

describe('buildAnalysis - Size matching fixes', () => {
  test('Case-insensitive size matching works correctly', () => {
    const dog = createTestDog({ size: 'Medium' });
    const prefs: UserPreferences = { size: ['medium'] };
    const analysis = buildAnalysis(dog, prefs);
    
    expect(analysis.matchedPrefs).toContainEqual({ key: 'size', label: 'Medium size fits your needs' });
    expect(analysis.unmetPrefs).not.toContainEqual(expect.objectContaining({ key: 'size' }));
    expect(analysis.matches).toContain('Medium is within your preferences');
    expect(analysis.mismatches).not.toContain(expect.stringMatching(/Size.*not in selected range/));
  });

  test('Multiple size selections work with OR logic', () => {
    const dog = createTestDog({ size: 'Large' });
    const prefs: UserPreferences = { size: ['small', 'medium'] };
    const analysis = buildAnalysis(dog, prefs);
    
    expect(analysis.unmetPrefs).toContainEqual({ key: 'size', label: 'Dog is Large; you selected small or medium' });
    expect(analysis.matchedPrefs).not.toContainEqual(expect.objectContaining({ key: 'size' }));
    expect(analysis.mismatches).toContain('Size Large not in selected range (small, medium)');
  });

  test('Extra whitespace in size values is handled correctly', () => {
    const dog = createTestDog({ size: ' medium ' });
    const prefs: UserPreferences = { size: ['Medium'] };
    const analysis = buildAnalysis(dog, prefs);
    
    expect(analysis.matchedPrefs).toContainEqual({ key: 'size', label: ' medium  size fits your needs' });
    expect(analysis.unmetPrefs).not.toContainEqual(expect.objectContaining({ key: 'size' }));
    expect(analysis.matches).toContain(' medium  is within your preferences');
  });

  test('No contradiction between size match and mismatch', () => {
    const dog = createTestDog({ size: 'Medium' });
    const prefs: UserPreferences = { size: ['medium'] };
    const analysis = buildAnalysis(dog, prefs);
    
    const hasSizeMatch = analysis.matchedPrefs.some(p => p.key === 'size');
    const hasSizeMismatch = analysis.unmetPrefs.some(p => p.key === 'size');
    
    expect(hasSizeMatch).toBe(true);
    expect(hasSizeMismatch).toBe(false);
    expect(hasSizeMatch && hasSizeMismatch).toBe(false);
  });

  test('Guidance weighting includes medium size', () => {
    const dog = createTestDog({ size: 'Medium' });
    const prefs: UserPreferences = { 
      size: ['Medium'],
      guidance: 'I need a medium-sized dog for my apartment'
    };
    const analysis = buildAnalysis(dog, prefs);
    
    // Should get bonus points for guidance trait
    expect(analysis.score).toBeGreaterThan(100);
    expect(analysis.matchedPrefs).toContainEqual({ key: 'size', label: 'Medium size fits your needs' });
  });
});

describe('buildAnalysis - Energy preferences', () => {
  test('High energy dog matches high energy preference', () => {
    const dog = createTestDog({ 
      breeds: ['Border Collie'], 
      tags: ['energetic'] 
    });
    const prefs: UserPreferences = { energy: 'high' };
    const analysis = buildAnalysis(dog, prefs);
    expect(analysis.matches).toContain('Energy suitable for active lifestyle');
    expect(analysis.matchedPrefs).toContainEqual({ key: 'energy', label: 'high' });
  });

  test('High energy dog mismatches low energy preference', () => {
    const dog = createTestDog({ 
      breeds: ['Border Collie'], 
      tags: ['energetic'] 
    });
    const prefs: UserPreferences = { energy: 'low' };
    const analysis = buildAnalysis(dog, prefs);
    expect(analysis.mismatches).toContain('High energy vs low desired');
    expect(analysis.unmetPrefs).toContainEqual({ key: 'energy', label: 'low' });
  });

  test('Puppy energy mismatches low energy preference', () => {
    const dog = createTestDog({ age: 'Baby' });
    const prefs: UserPreferences = { energy: 'low' };
    const analysis = buildAnalysis(dog, prefs);
    expect(analysis.mismatches).toContain('Puppy energy vs low-maintenance');
    expect(analysis.unmetPrefs).toContainEqual({ key: 'energy', label: 'low' });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTop3Reasoning, generateAllMatchesReasoning } from '../lib/explanation';

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('E2E citation and verification', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Ensure debug logs can be enabled without failing
    (process as any).env.DEBUG_REASONING = '1';
  });

  const dog = {
    id: 'd1', name: 'Cleo', breeds: ['Poodle'], age: 'young', size: 'medium', energy: 'medium',
    temperament: ['kid-friendly'], location: { zip: '10001' }
  } as any;

  const analysis = {
    dogId: 'd1', score: 95, matchedPrefs: ['medium energy', 'quiet'], unmetPrefs: [], reasons: {}
  } as any;

  const effectivePrefs = {
    zipCodes: ['10001'], radiusMi: 50,
    breeds: { include: [], exclude: [], expandedInclude: [], expandedExclude: [], notes: [], origin: 'user' },
    age: { value: [], origin: 'default' },
    size: { value: [], origin: 'default' },
    energy: { value: 'medium', origin: 'user' },
    temperament: { value: ['quiet'], origin: 'user' },
    flags: { quietPreferred: true }
  } as any;

  it('patches a "moderate energy" sentence to cite "medium energy"', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reasoning: 'Kid-friendly with moderate energy for calm homes.' }) });
    const res = await generateTop3Reasoning(dog, analysis, effectivePrefs);
    expect(res.primary.toLowerCase()).toContain('medium energy');
  });

  it('returns empty string for All Matches (no AI)', async () => {
    const blurb = await generateAllMatchesReasoning(dog, analysis, effectivePrefs);
    expect(blurb).toBe('');
  });
});



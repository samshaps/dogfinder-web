import { describe, it, expect } from 'vitest';
import { verifyBlurb } from '../lib/verify';
import { FactPack } from '../lib/facts';

describe('verifyBlurb', () => {
  const baseFacts: FactPack = {
    prefs: ['medium energy', 'quiet'],
    dogTraits: ['medium energy', 'kid-friendly'],
    banned: ['apartment', 'house-trained', 'crate-trained', 'purebred', 'service dog', 'rare', 'hypoallergenic']
  };

  it('accepts synonym mentions (moderate ↔ medium) as preference hits', () => {
    const text = 'Kid-friendly dog with moderate energy for a calm home.';
    const res = verifyBlurb(text, baseFacts, { lengthCap: 150 });
    expect(res.ok).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.fixed.toLowerCase()).toMatch(/moderate energy|medium energy/);
  });

  it('removes unsupported hypoallergenic claim if not in dog facts', () => {
    const text = 'Quiet companion, hypoallergenic and calm.';
    const facts: FactPack = { ...baseFacts, dogTraits: ['medium energy', 'kid-friendly'] };
    const res = verifyBlurb(text, facts, { lengthCap: 150 });
    expect(res.fixed.toLowerCase()).not.toContain('hypoallergenic');
  });

  it('fails when defaults are mentioned (e.g., adult, xl) if not in prefs', () => {
    const text = 'Adult XL dog that is a perfect match.';
    const res = verifyBlurb(text, baseFacts, { lengthCap: 150 });
    // Should flag unsupported terms unless present in prefs or traits
    expect(res.errors.length).toBeGreaterThan(0);
  });
});



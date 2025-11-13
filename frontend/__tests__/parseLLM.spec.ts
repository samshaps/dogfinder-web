import { describe, it, expect, test } from 'vitest';
import { sanitizeReasoning, scrubPII, sanitizePerspective, finalClamp, sanitizeNoPreferenceClaims } from '../lib/explanation';
import { COPY_MAX } from '../lib/constants/copyLimits';
import { verifyBlurb } from '../lib/verify';
import { buildFactPack } from '../lib/facts';

describe('PII guardrails', () => {
  it('removes direct name addressee like "for you, Sarah!"', () => {
    const input = 'Great for apartment living and your medium energy preference — perfect for you, Sarah!';
    const out = sanitizeReasoning(input, COPY_MAX.TOP);
    expect(out).not.toMatch(/Sarah/);
    expect(out.length).toBeLessThanOrEqual(COPY_MAX.TOP);
  });

  it('removes emails and phones', () => {
    const input = 'Quiet, kid-friendly match for you. Contact me at sam@example.com or (415) 555-1234';
    const out = sanitizeReasoning(input, COPY_MAX.TOP);
    expect(out).not.toMatch(/@/);
    expect(out).not.toMatch(/555-1234/);
  });

  it('does not over-strip general content', () => {
    const input = 'Matches your medium energy and quiet home preference.';
    const out = scrubPII(input);
    expect(out).toBe(input);
  });

  it(`caps body at ${COPY_MAX.TOP - 1} and appends a period to make ≤${COPY_MAX.TOP}`, () => {
    const body = 'A'.repeat(COPY_MAX.TOP - 1);
    const out = sanitizeReasoning(body, COPY_MAX.TOP);
    expect(out.endsWith('.')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(COPY_MAX.TOP);
  });

  it('forbids preference language when no prefs exist', () => {
    const text = 'Fits your preference for a large dog and calm home.';
    const facts = buildFactPack({
      age: { value: [], origin: 'user' },
      size: { value: [], origin: 'user' },
      temperament: { value: [], origin: 'user' },
      flags: {},
    } as any, {
      id: '1', name: 'Rex', breeds: ['Great Dane'], age: 'young', size: 'large', energy: 'medium', temperament: [], location: { zip: '00000', distanceMi: 0 }, hypoallergenic: false, shedLevel: 'med', groomingLoad: 'med', barky: false, rawDescription: '', gender: 'male', photos: [], publishedAt: '', city: '', state: '', tags: [], url: '', shelter: { name: '' }
    } as any);
    const v = verifyBlurb(text, facts, { lengthCap: COPY_MAX.TOP });
    expect(v.fixed.toLowerCase()).not.toMatch(/your preference|you want|you need|fits your|matches your/);
  });

  it('requires citing a preference when prefs exist', () => {
    const text = 'A friendly companion for your home';
    const facts = buildFactPack({
      age: { value: ['young'], origin: 'user' },
      size: { value: ['large'], origin: 'user' },
      temperament: { value: ['quiet'], origin: 'user' },
      energy: { value: 'medium', origin: 'user' },
      flags: {},
    } as any, {
      id: '1', name: 'Rex', breeds: ['Great Dane'], age: 'young', size: 'large', energy: 'medium', temperament: [], location: { zip: '00000', distanceMi: 0 }, hypoallergenic: false, shedLevel: 'med', groomingLoad: 'med', barky: false, rawDescription: '', gender: 'male', photos: [], publishedAt: '', city: '', state: '', tags: [], url: '', shelter: { name: '' }
    } as any);
    const v = verifyBlurb(text, facts, { lengthCap: COPY_MAX.TOP });
    // After fixup, it should add a short citation mentioning one pref
    expect(v.fixed.toLowerCase()).toMatch(/young|large|quiet|medium energy/);
  });
});

describe('Perspective sanitizer and final clamp', () => {
  it('rewrites dog-addressing into adopter-addressing', () => {
    const input = 'You, a baby Great Dane-Boxer mix, could be a wonderful companion with your affectionate nature, playful demeanor, and medium energy level.';
    const out = sanitizePerspective(input);
    expect(out.toLowerCase()).not.toMatch(/^you,\s+a\s+/);
    expect(out.toLowerCase()).toMatch(/great fit for you/);
    expect(out).toMatch(/Great Dane/i);
  });

  it('clamps without mid-word cutoff and ends cleanly', () => {
    const input = 'For someone like you who prefers a young, medium-sized, mixed breed dog with medium energy and a quiet demeanor, you could find a perfect companion f';
    const squeezed = finalClamp(input, COPY_MAX.TOP);
    expect(squeezed.length).toBeLessThanOrEqual(COPY_MAX.TOP);
    expect(/\w$/.test(squeezed)).toBe(false);
    expect(/[.!?]$/.test(squeezed)).toBe(true);
  });

  it('strips implied preference language when no preferences exist', () => {
    const input = 'You, as an active individual, would enjoy the companionship of a young, medium-energy mixed breed dog that is quiet.';
    const out = sanitizeNoPreferenceClaims(input);
    expect(out.toLowerCase()).not.toMatch(/^you,\s+as\s+an\s+/);
    expect(out.toLowerCase()).not.toMatch(/you\s+(would\s+)?enjoy/);
    expect(out.toLowerCase()).toMatch(/young|medium|quiet/);
  });
});

// Note: LLM response parsing utilities have been removed as part of the migration to OpenAI Responses API
// The Responses API now handles JSON schema validation natively, eliminating the need for custom parsing

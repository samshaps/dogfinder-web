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

  it('caps body at 149 and appends a period to make ≤150', () => {
    const body = 'A'.repeat(149);
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

// Tests for LLM response parsing utilities

import { extractJsonBlock, tryParseReasoning, tryParseShortReasoning } from '../utils/parseLLM';

describe('extractJsonBlock', () => {
  test('extracts JSON from text with surrounding content', () => {
    const input = 'Here is the reasoning: {"primary":"Great match","additional":["friendly"],"concerns":[]} more text';
    const result = extractJsonBlock(input);
    expect(result).toBe('{"primary":"Great match","additional":["friendly"],"concerns":[]}');
  });

  test('extracts JSON from markdown-style response', () => {
    const input = '```json\n{"primary":"Perfect dog","additional":[],"concerns":["needs training"]}\n```';
    const result = extractJsonBlock(input);
    expect(result).toBe('{"primary":"Perfect dog","additional":[],"concerns":["needs training"]}');
  });

  test('returns null when no valid JSON found', () => {
    const input = 'This is just plain text with no JSON';
    const result = extractJsonBlock(input);
    expect(result).toBeNull();
  });

  test('handles nested JSON objects', () => {
    const input = 'Response: {"primary":"Good match","additional":["calm","house trained"],"concerns":[]} end';
    const result = extractJsonBlock(input);
    expect(result).toBe('{"primary":"Good match","additional":["calm","house trained"],"concerns":[]}');
  });
});

describe('tryParseReasoning', () => {
  test('parses valid JSON reasoning object', () => {
    const input = '{"primary":"Excellent choice","additional":["hypoallergenic","good with kids"],"concerns":[]}';
    const result = tryParseReasoning(input);
    
    expect(result).toEqual({
      primary: "Excellent choice",
      additional: ["hypoallergenic", "good with kids"],
      concerns: []
    });
  });

  test('parses JSON from markdown code fence', () => {
    const input = '```json\n{"primary":"Great dog","additional":[],"concerns":["high energy"]}\n```';
    const result = tryParseReasoning(input);
    
    expect(result).toEqual({
      primary: "Great dog",
      additional: [],
      concerns: ["high energy"]
    });
  });

  test('parses JSON from mixed content', () => {
    const input = 'Here is my analysis: {"primary":"Perfect match for your family","additional":["gentle"],"concerns":[]} Hope this helps!';
    const result = tryParseReasoning(input);
    
    expect(result).toEqual({
      primary: "Perfect match for your family",
      additional: ["gentle"],
      concerns: []
    });
  });

  test('clamps primary to 150 characters', () => {
    const longPrimary = 'A'.repeat(200);
    const input = `{"primary":"${longPrimary}","additional":[],"concerns":[]}`;
    const result = tryParseReasoning(input);
    
    expect(result?.primary).toHaveLength(150);
    expect(result?.primary).toBe('A'.repeat(150));
  });

  test('clamps additional items to 50 characters and max 2 items', () => {
    const longItem = 'B'.repeat(100);
    const input = `{"primary":"Test","additional":["${longItem}","short","third item"],"concerns":[]}`;
    const result = tryParseReasoning(input);
    
    expect(result?.additional).toHaveLength(2);
    expect(result?.additional[0]).toHaveLength(50);
    expect(result?.additional[0]).toBe('B'.repeat(50));
    expect(result?.additional[1]).toBe("short");
  });

  test('clamps concerns to 50 characters each', () => {
    const longConcern = 'C'.repeat(100);
    const input = `{"primary":"Test","additional":[],"concerns":["${longConcern}","short concern"]}`;
    const result = tryParseReasoning(input);
    
    expect(result?.concerns[0]).toHaveLength(50);
    expect(result?.concerns[0]).toBe('C'.repeat(50));
    expect(result?.concerns[1]).toBe("short concern");
  });

  test('returns null for invalid JSON', () => {
    const input = 'This is not valid JSON at all';
    const result = tryParseReasoning(input);
    expect(result).toBeNull();
  });

  test('returns null for JSON without required fields', () => {
    const input = '{"name":"test","value":123}';
    const result = tryParseReasoning(input);
    expect(result).toBeNull();
  });

  test('handles empty string', () => {
    const result = tryParseReasoning('');
    expect(result).toBeNull();
  });
});

describe('tryParseShortReasoning', () => {
  test('parses short text directly', () => {
    const input = 'Great family dog';
    const result = tryParseShortReasoning(input);
    expect(result).toBe('Great family dog');
  });

  test('parses JSON with primary field', () => {
    const input = '{"primary":"Perfect match for apartment living"}';
    const result = tryParseShortReasoning(input);
    expect(result).toBe('Perfect match for apartment living');
  });

  test('parses JSON from mixed content', () => {
    const input = 'Here is the reasoning: {"primary":"Excellent choice"} more text';
    const result = tryParseShortReasoning(input);
    expect(result).toBe('Excellent choice');
  });

  test('clamps result to 50 characters', () => {
    const longText = 'A'.repeat(100);
    const result = tryParseShortReasoning(longText);
    expect(result).toBe('A'.repeat(47) + '...');
  });

  test('handles markdown code fences', () => {
    const input = '```json\n{"primary":"Calm and gentle"}\n```';
    const result = tryParseShortReasoning(input);
    expect(result).toBe('Calm and gentle');
  });

  test('returns null for empty input', () => {
    const result = tryParseShortReasoning('');
    expect(result).toBeNull();
  });

  test('returns null for invalid input', () => {
    const result = tryParseShortReasoning('{}');
    expect(result).toBeNull();
  });
});

describe('Real-world scenarios', () => {
  test('handles OpenAI response with backticks', () => {
    const input = '```\n{"primary":"Adult age matches your preference and Medium size fits your apartment needs","additional":["Good with kids","House trained"],"concerns":[]}\n```';
    const result = tryParseReasoning(input);
    
    expect(result).toEqual({
      primary: "Adult age matches your preference and Medium size fits your apartment needs",
      additional: ["Good with kids", "House trained"],
      concerns: []
    });
  });

  test('handles malformed JSON with extra characters', () => {
    const input = '{"primary":"Great dog","additional":["friendly"],"concerns":[]}extra text';
    const result = tryParseReasoning(input);
    
    expect(result).toEqual({
      primary: "Great dog",
      additional: ["friendly"],
      concerns: []
    });
  });

  test('handles prose with embedded JSON', () => {
    const input = 'Based on your preferences, here is my recommendation: {"primary":"Perfect match","additional":["hypoallergenic"],"concerns":[]} This dog meets all your requirements.';
    const result = tryParseReasoning(input);
    
    expect(result).toEqual({
      primary: "Perfect match",
      additional: ["hypoallergenic"],
      concerns: []
    });
  });

  test('falls back gracefully on garbage input', () => {
    const input = 'asdfghjkl;qwertyuiop[zxcvbnm,./1234567890';
    const result = tryParseReasoning(input);
    expect(result).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { applyDogPronouns, getDogPronouns, normalizeDogGender } from '@/lib/utils/pronouns';

describe('pronoun utilities', () => {
  it('normalizes gender strings', () => {
    expect(normalizeDogGender('Male')).toBe('male');
    expect(normalizeDogGender('f')).toBe('female');
    expect(normalizeDogGender(undefined)).toBe('unknown');
  });

  it('applies masculine pronouns correctly', () => {
    const pronouns = getDogPronouns('Male');
    const input = 'It loves its family because it is loyal. Give it a hug when you meet it.';
    const output = applyDogPronouns(input, pronouns);
    expect(output).toContain('He loves his family because he is loyal.');
    expect(output).toContain('Give him a hug when you meet him.');
    expect(/(^|\s)it(\s|\.|,|!|\?)/i.test(output)).toBe(false);
  });

  it('applies neutral pronouns and grammar fixes', () => {
    const pronouns = getDogPronouns(null);
    const input = 'It loves its toys because it is playful. Give it time if you meet it.';
    const output = applyDogPronouns(input, pronouns);
    expect(output).toContain('They love their toys because they are playful.');
    expect(output).toContain('Give them time if you meet them.');
    expect(/(^|\s)it(\s|\.|,|!|\?)/i.test(output)).toBe(false);
  });
});


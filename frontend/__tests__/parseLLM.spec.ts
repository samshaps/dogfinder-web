// Tests for LLM response parsing utilities

import { extractJsonBlock, tryParseReasoning, tryParseShortReasoning } from '@/utils/parseLLM';

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

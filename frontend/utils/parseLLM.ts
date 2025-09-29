// LLM Response Parsing Utilities
// Handles various response formats from language models and extracts JSON

export interface ParsedReasoning {
  primary: string;
  additional: string[];
  concerns: string[];
}

/**
 * Extracts JSON block from a string that may contain other text
 * Handles cases like: "Here's the reasoning: {\"primary\":\"...\"} more text"
 */
export function extractJsonBlock(text: string): string | null {
  if (!text) return null;
  
  // Try to find JSON object in the text
  const jsonPatterns = [
    // Standard JSON object
    /\{[\s\S]*?\}/,
    // JSON with potential nesting
    /\{(?:[^{}]|{[^{}]*})*\}/,
    // JSON that might have escaped quotes
    /\{(?:[^"\\]|\\.)*"(?:[^"\\]|\\.)*"\s*:\s*(?:[^"\\]|\\.)*"(?:[^"\\]|\\.)*"(?:[^"\\,]|\\.)*\}/,
  ];
  
  for (const pattern of jsonPatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        // Validate that it's actually JSON by parsing it
        JSON.parse(match[0]);
        return match[0];
      } catch {
        // Not valid JSON, try next pattern
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Attempts to parse reasoning from various LLM response formats
 * Returns structured object or null if parsing fails
 */
export function tryParseReasoning(response: string): ParsedReasoning | null {
  if (!response) return null;
  
  let jsonText = response.trim();
  
  // Remove common markdown code fences
  jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  
  // Remove backticks and other formatting
  jsonText = jsonText.replace(/`/g, '');
  
  // Try direct JSON parsing first
  try {
    const parsed = JSON.parse(jsonText);
    if (isValidReasoningObject(parsed)) {
      return clampReasoningLengths(parsed);
    }
  } catch {
    // Not direct JSON, try extracting JSON block
    const jsonBlock = extractJsonBlock(jsonText);
    if (jsonBlock) {
      try {
        const parsed = JSON.parse(jsonBlock);
        if (isValidReasoningObject(parsed)) {
          return clampReasoningLengths(parsed);
        }
      } catch {
        // JSON block found but not valid reasoning format
      }
    }
  }
  
  return null;
}

/**
 * Validates that a parsed object has the correct reasoning structure
 */
function isValidReasoningObject(obj: any): obj is ParsedReasoning {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.primary === 'string' &&
    Array.isArray(obj.additional) &&
    Array.isArray(obj.concerns) &&
    obj.additional.every((item: any) => typeof item === 'string') &&
    obj.concerns.every((item: any) => typeof item === 'string')
  );
}

/**
 * Clamps the lengths of reasoning fields to prevent UI overflow
 */
function clampReasoningLengths(reasoning: ParsedReasoning): ParsedReasoning {
  return {
    primary: reasoning.primary.substring(0, 150),
    additional: reasoning.additional
      .slice(0, 2) // Cap to 2 items max
      .map(item => item.substring(0, 50)), // Each item ≤50 chars
    concerns: reasoning.concerns
      .map(item => item.substring(0, 50)) // Each item ≤50 chars
  };
}

/**
 * Attempts to parse a short reasoning string (for all-match responses)
 * Returns string or null if parsing fails
 */
export function tryParseShortReasoning(response: string): string | null {
  if (!response) return null;
  
  let text = response.trim();
  
  // Remove common markdown code fences
  text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  
  // Remove backticks and other formatting
  text = text.replace(/`/g, '');
  
  // Try to extract JSON if it exists
  const jsonBlock = extractJsonBlock(text);
  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock);
      if (typeof parsed === 'object' && parsed.primary) {
        return parsed.primary.substring(0, 50);
      }
      if (typeof parsed === 'string') {
        return parsed.substring(0, 50);
      }
    } catch {
      // Not valid JSON, fall through to string processing
    }
  }
  
  // Return the text itself if it's reasonable length
  if (text.length <= 50 && text.length > 0) {
    return text;
  }
  
  // If too long, truncate
  if (text.length > 50) {
    return text.substring(0, 47) + '...';
  }
  
  return null;
}

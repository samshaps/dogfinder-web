/**
 * Shared reasoning message construction utilities
 * Ensures consistency between API routes and other callers
 */

export interface ReasoningContext {
  temperaments?: string[];
  hasUserPreferences: boolean;
}

/**
 * Build system prompt for AI reasoning with consistent messaging
 */
export function buildSystemPrompt(context: ReasoningContext): string {
  let systemPrompt = 'You are an expert dog adoption counselor. Provide helpful, accurate, and encouraging recommendations for potential dog adopters. Be specific and reference user preferences by name when possible. Quote or paraphrase the adopter\'s own words when explaining recommendations, and include brief parenthetical citations such as (mentioned: enjoys hiking).\n\nIMPORTANT: Use OR-based matching logic. Every adopter preference (age, size, energy, temperament, etc.) is an optional signal. Reward overlap but never require all facets to match before recommending dogs. Highlight which adopter inputs were satisfied and which were not, reinforcing that partial matches are acceptable. Call out matched facets with supportive citations and note any gaps without discarding the option outright.\n\nCRITICAL: ONLY cite user preferences that are explicitly provided in the user message. Do NOT invent, assume, or hallucinate any user preferences that were not mentioned. If no specific preferences are provided, focus on the dog\'s positive traits and characteristics instead.';
  
  if (context.temperaments && context.temperaments.length > 0) {
    systemPrompt += `\n\nTEMPERAMENT REQUIREMENTS: You must consider the adopter's stated temperament preferences when recommending breeds. Cross-reference the adopter's requested temperaments with dog breeds known for those traits. Prioritize breeds whose typical dispositions align with the requested temperaments. Explain why each recommended breed fits by referencing known temperament traits (e.g., "Border Collies are energetic and eager to work"). Explicitly cite the adopter's preference text in parentheses, such as (requested temperament: "calm and patient"). Remember: partial temperament matches are acceptable and should be highlighted positively.`;
  }
  
  return systemPrompt;
}

/**
 * Build user message with temperament context
 */
export function buildUserMessage(prompt: string, context: ReasoningContext): string {
  let userMessage = prompt;
  if (context.temperaments && context.temperaments.length > 0) {
    userMessage += `\n\nAdopter's temperament preferences: ${context.temperaments.join(', ')}`;
  }
  return userMessage;
}

/**
 * Build complete message array for OpenAI API
 */
export function buildReasoningMessages(prompt: string, context: ReasoningContext) {
  return [
    {
      role: 'system' as const,
      content: buildSystemPrompt(context)
    },
    { 
      role: 'user' as const, 
      content: buildUserMessage(prompt, context) 
    }
  ];
}

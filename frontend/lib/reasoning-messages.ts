/**
 * Shared reasoning message construction utilities
 * Ensures consistency between API routes and other callers
 */

import { DogPronouns } from './utils/pronouns';

export interface ReasoningContext {
  temperaments?: string[];
  hasUserPreferences: boolean;
  pronouns?: DogPronouns;
  dogName?: string;
}

/**
 * Build system prompt for AI reasoning with consistent messaging
 */
export function buildSystemPrompt(context: ReasoningContext): string {
  let systemPrompt = 'You are an expert dog adoption counselor. Provide helpful, accurate, and encouraging recommendations for potential dog adopters. Be specific and reference user preferences by name when possible. Quote or paraphrase the adopter\'s own words when explaining recommendations, and include brief parenthetical citations such as (mentioned: enjoys hiking).\n\nIMPORTANT: Use OR-based matching logic. Every adopter preference (age, size, energy, temperament, etc.) is an optional signal. Reward overlap but never require all facets to match before recommending dogs. Highlight which adopter inputs were satisfied and which were not, reinforcing that partial matches are acceptable. Call out matched facets with supportive citations and note any gaps without discarding the option outright.\n\nCRITICAL: ONLY cite user preferences that are explicitly provided in the user message. Do NOT invent, assume, or hallucinate any user preferences that were not mentioned. If no specific preferences are provided, focus on the dog\'s positive traits and characteristics instead.';
  
  if (context.temperaments && context.temperaments.length > 0) {
    systemPrompt += `\n\nTEMPERAMENT REQUIREMENTS: You must consider the adopter's stated temperament preferences when recommending breeds. Cross-reference the adopter's requested temperaments with dog breeds known for those traits. Prioritize breeds whose typical dispositions align with the requested temperaments. Explain why each recommended breed fits by referencing known temperament traits (e.g., "Border Collies are energetic and eager to work"). Explicitly cite the adopter's preference text in parentheses, such as (requested temperament: "calm and patient"). Remember: partial temperament matches are acceptable and should be highlighted positively.`;
  }
  
  // Add specific guidance for minimal input scenarios
  if (!context.hasUserPreferences) {
    systemPrompt += `\n\nMINIMAL INPUT GUIDANCE: When no specific user preferences are provided, focus on highlighting the breed's most positive and appealing characteristics. Do NOT mention size (small, medium, large, xl) unless explicitly provided by the user. Emphasize what makes this breed special and why they make excellent companions. Highlight their unique traits, personality, temperament, or special qualities. Use engaging phrases like "known for", "renowned for", "famous for", "typically", or "often" when describing breed characteristics. Make the recommendation feel personal and compelling by highlighting why this breed could be a wonderful addition to someone's life. Focus on positive attributes that would appeal to potential adopters.`;
  }

  if (context.pronouns) {
    if (context.pronouns.gender === 'unknown') {
      systemPrompt += `\n\nPRONOUN GUIDANCE: The dog's gender is unknown. Use neutral pronouns (${context.pronouns.subject}/${context.pronouns.object}/${context.pronouns.possessiveAdjective}) and phrases like "${context.pronouns.noun}". Never refer to the dog as "it".`;
    } else {
      systemPrompt += `\n\nPRONOUN GUIDANCE: The dog uses ${context.pronouns.subject}/${context.pronouns.object}/${context.pronouns.possessiveAdjective} pronouns. Use phrases like "${context.pronouns.noun}" as needed. Never refer to the dog as "it". If pronouns ever feel ambiguous, repeat the dog's name instead.`;
    }
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
  if (context.pronouns) {
    if (context.pronouns.gender === 'unknown') {
      userMessage += `\n\nPronoun guidance: Use neutral pronouns (${context.pronouns.subject}/${context.pronouns.object}/${context.pronouns.possessiveAdjective}) and say "${context.pronouns.noun}". Never call the dog "it".`;
    } else {
      userMessage += `\n\nPronoun guidance: Use ${context.pronouns.subject}/${context.pronouns.object}/${context.pronouns.possessiveAdjective} pronouns and phrases like "${context.pronouns.noun}". Never call the dog "it".`;
    }
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

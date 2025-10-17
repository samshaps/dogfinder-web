import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface BuildReasoningMessagesOptions {
  prompt: string;
  temperaments?: string[];
}

/**
 * Build the shared system + user messages for reasoning requests.
 * Ensures temperament guidance and citation instructions are identical
 * across server-direct calls and the API route.
 */
export function buildReasoningMessages({
  prompt,
  temperaments,
}: BuildReasoningMessagesOptions): ChatCompletionMessageParam[] {
  let systemPrompt =
    "You are an expert dog adoption counselor. Provide helpful, accurate, and encouraging recommendations for potential dog adopters. Be specific and reference user preferences by name when possible. Quote or paraphrase the adopter's own words when explaining recommendations, and include brief parenthetical citations such as (mentioned: enjoys hiking).";

  if (temperaments && temperaments.length > 0) {
    systemPrompt +=
      "\n\nTEMPERAMENT REQUIREMENTS: You must consider the adopter's stated temperament preferences when recommending breeds. Cross-reference the adopter's requested temperaments with dog breeds known for those traits. Prioritize breeds whose typical dispositions align with the requested temperaments. Explain why each recommended breed fits by referencing known temperament traits (e.g., \"Border Collies are energetic and eager to work\"). Explicitly cite the adopter's preference text in parentheses, such as (requested temperament: \"calm and patient\").";
  } else {
    systemPrompt +=
      "\n\nIf no explicit user preferences are provided, focus on the dog's standout qualities using only the supplied facts. Offer welcoming, general guidance without inventing adopter preferences.";
  }

  let userMessage = prompt;
  if (temperaments && temperaments.length > 0) {
    userMessage += `\n\nAdopter's temperament preferences: ${temperaments.join(', ')}`;
  }

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];
}


import OpenAI from 'openai';
import { COPY_MAX } from './constants/copyLimits';

// Note: Environment variable validation moved to getOpenAIClient() to avoid build-time errors

// Memoized OpenAI client instance
let clientInstance: OpenAI | null = null;

// Simple in-memory cache for responses (keyed by prompt hash)
const responseCache = new Map<string, { response: NormalizedResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a memoized OpenAI client instance configured for the Responses API
 */
export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required but not configured. Please set it in your environment variables.');
  }
  
  if (!clientInstance) {
    clientInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return clientInstance;
}

/**
 * Check if OpenAI is properly configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Response format for structured JSON responses
 */
export interface StructuredResponse {
  primary: string;
  additional: string[];
  concerns: string[];
}

/**
 * Normalized response from OpenAI Responses API
 */
export interface NormalizedResponse {
  output_text: string;
  raw: any;
}

/**
 * Options for running a response generation
 */
export interface ResponseOptions {
  model?: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: 'json_object' } | { type: 'json_schema'; json_schema: { name: string; schema: any } };
}

/**
 * Sanitize and validate numeric parameters
 */
function sanitizeNumericParam(value: any, defaultValue: number, min: number, max: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(min, Math.min(value, max));
  }
  return defaultValue;
}

/**
 * Simple hash function for caching
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Run a response generation using the Responses API
 */
export async function runResponse(options: ResponseOptions): Promise<NormalizedResponse> {
  // Create cache key from options
  const cacheKey = simpleHash(JSON.stringify({
    model: options.model || 'gpt-4o-mini',
    messages: options.messages,
    max_tokens: options.max_tokens,
    temperature: options.temperature,
    response_format: options.response_format
  }));
  
  // Check cache first
  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.response;
  }
  
  const client = getOpenAIClient();
  
  // Sanitize parameters
  const maxTokens = sanitizeNumericParam(options.max_tokens, 200, 1, 4000);
  const temperature = sanitizeNumericParam(options.temperature, 0.2, 0, 2);
  
  const response = await client.chat.completions.create({
    model: options.model || 'gpt-4o-mini',
    messages: options.messages,
    max_tokens: maxTokens,
    temperature,
    response_format: options.response_format,
    // Optimize for speed
    stream: false,
  }, {
    timeout: 10000, // 10 second timeout
  });

  const outputText = response.choices[0]?.message?.content?.trim() || '';
  
  const result = {
    output_text: outputText,
    raw: response,
  };
  
  // Cache the result
  responseCache.set(cacheKey, { response: result, timestamp: Date.now() });
  
  return result;
}

/**
 * Run a structured response generation with JSON schema validation
 */
export async function runStructuredResponse(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  } = {}
): Promise<StructuredResponse> {
  const response = await runResponse({
    model: options.model || 'gpt-4o-mini',
    messages,
    max_tokens: options.max_tokens || 200,
    temperature: options.temperature || 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'reasoning_response',
        schema: {
          type: 'object',
          properties: {
            primary: {
              type: 'string',
              description: 'Summarize the best-fit dog (name/breed) using OR-based matching logic. Highlight which adopter preferences were satisfied with supportive citations (e.g., "Matches your requested calm temperament") and note any gaps without discarding the option (e.g., "Doesn\'t meet the low-shedding request but excels in other areas"). Include parenthetical citations referencing the exact temperament phrases the adopter provided. Quote or paraphrase the adopter\'s own words when explaining recommendations, and include brief parenthetical citations such as (mentioned: enjoys hiking) or (requested temperament: "calm and patient"). Emphasize that partial matches are acceptable and valuable.'
            },
            additional: {
              type: 'array',
              items: { 
                type: 'string',
                description: 'Detail why this alternative fits using OR-based logic; cite both the adopter\'s words and the breed\'s common traits. Highlight partial matches positively rather than focusing on what\'s missing.'
              },
              description: 'Additional positive traits, each citing specific adopter details and temperament matches when possible. Use OR-based matching to reward overlap rather than requiring all facets to match.'
            },
            concerns: {
              type: 'array',
              items: { 
                type: 'string',
                description: 'If a temperament mismatch exists, clearly state it and reference the conflicting preference, but frame it as a minor consideration rather than a disqualifier. Use OR-based matching to acknowledge gaps without discarding the option.'
              },
              description: 'Any concerns or considerations, citing relevant adopter details and temperament conflicts. Frame these as minor considerations rather than disqualifiers, emphasizing the OR-based matching approach.'
            }
          },
          required: ['primary', 'additional', 'concerns'],
          additionalProperties: false
        }
      }
    }
  });

  try {
    const parsed = JSON.parse(response.output_text);
    return {
      primary: parsed.primary || '',
      additional: Array.isArray(parsed.additional) ? parsed.additional : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : []
    };
  } catch (error) {
    // Fallback to basic structure if JSON parsing fails
    return {
      primary: response.output_text.substring(0, COPY_MAX.TOP),
      additional: [],
      concerns: []
    };
  }
}

/**
 * Run a free-form text response generation
 */
export async function runTextResponse(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const response = await runResponse({
    model: options.model || 'gpt-4o-mini',
    messages,
    max_tokens: options.max_tokens || 200,
    temperature: options.temperature || 0.2,
  });

  return response.output_text;
}

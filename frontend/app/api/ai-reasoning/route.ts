import { NextRequest, NextResponse } from 'next/server';
import { runStructuredResponse, runTextResponse, isOpenAIConfigured } from '@/lib/openai-client';
import { buildReasoningMessages } from '@/lib/reasoning-messages';

/**
 * AI Reasoning API Route
 * 
 * Generates AI-powered explanations for dog adoption recommendations.
 * 
 * Request Body:
 * - prompt: string - The main prompt describing the dog and context
 * - type: 'free' | 'top-pick' | 'short' - Type of reasoning to generate
 * - max_tokens?: number - Maximum tokens for the response
 * - temperature?: number - Temperature for response generation
 * - temperaments?: string[] - User's temperament preferences (REQUIRED for top-pick reasoning)
 * 
 * For "top-pick" type, temperament preferences are mandatory context and responses will cite them explicitly.
 * The AI will cross-reference requested temperaments with breed traits and provide parenthetical citations.
 */

export async function POST(request: NextRequest) {
  try {
    const { prompt, type, max_tokens, temperature, temperaments } = await request.json();
    
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      console.warn('OpenAI not configured, returning fallback response');
      if (type === 'free') {
        return NextResponse.json({ reasoning: 'AI reasoning not available' });
      } else if (type === 'top-pick') {
        return NextResponse.json({ 
          reasoning: {
            primary: 'AI reasoning not available',
            additional: [],
            concerns: []
          }
        });
      } else {
        return NextResponse.json({ reasoning: 'AI reasoning not available' });
      }
    }
    
    console.log('🚀 Calling OpenAI Responses API...');
    
    // Build messages using shared utility for consistency
    // Check if user has minimal preferences by looking for key indicators in the prompt
    const hasMinimalPrefs = !prompt || 
      prompt.toLowerCase().includes('none explicitly provided') ||
      prompt.toLowerCase().includes('limited') ||
      (prompt.split('\n').length <= 2 && !prompt.toLowerCase().includes('preferences'));
    
    const context = {
      temperaments: temperaments && Array.isArray(temperaments) ? temperaments : undefined,
      hasUserPreferences: !hasMinimalPrefs
    };
    
    const messages = buildReasoningMessages(prompt as string, context);

    if (type === 'free') {
      if (process.env.DEBUG_REASONING === '1') {
        console.log('[ai-reasoning] FREE prompt:', prompt);
      }
      // Plain text mode for free-form generation
      const reasoning = await runTextResponse(messages, {
        max_tokens: Math.min(Number(max_tokens || 60), 80),
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.3)) : 0.1,
      });
      return NextResponse.json({ reasoning });
    } else if (type === 'top-pick') {
      // Structured response for top picks with JSON schema validation
      const reasoning = await runStructuredResponse(messages, {
        max_tokens: 150,
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.3)) : 0.1,
      });
      return NextResponse.json({ reasoning });
    } else {
      // Short response for all matches
      const reasoning = await runTextResponse(messages, {
        max_tokens: 50,
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.3)) : 0.1,
      });
      return NextResponse.json({ reasoning: reasoning.substring(0, 50) });
    }

  } catch (error) {
    console.error('AI reasoning API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI reasoning' },
      { status: 500 }
    );
  }
}
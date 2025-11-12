import { NextRequest, NextResponse } from 'next/server';
import { runStructuredResponse, runTextResponse, isOpenAIConfigured } from '@/lib/openai-client';
import { buildReasoningMessages } from '@/lib/reasoning-messages';
import { DogPronouns, getDogPronouns } from '@/lib/utils/pronouns';

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
  const startTime = Date.now();
  const requestId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const parseStartTime = Date.now();
    const { prompt, type, max_tokens, temperature, temperaments, pronouns, dogName } = await request.json();
    const parseDuration = Date.now() - parseStartTime;
    const promptLength = prompt?.length || 0;
    
    console.log(`[${requestId}] 🤖 AI reasoning request`, {
      type,
      promptLength,
      parseDuration: `${parseDuration}ms`
    });
    
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
    
    const openaiStartTime = Date.now();
    console.log(`[${requestId}] 🚀 Calling OpenAI Responses API...`);
    
    // Build messages using shared utility for consistency
    // Check if user has minimal preferences by looking for key indicators in the prompt
    const hasMinimalPrefs = !prompt || 
      prompt.toLowerCase().includes('none explicitly provided') ||
      prompt.toLowerCase().includes('limited') ||
      (prompt.split('\n').length <= 2 && !prompt.toLowerCase().includes('preferences'));
    
    const pronounContext: DogPronouns | undefined = (() => {
      if (!pronouns || typeof pronouns !== 'object') return undefined;
      const base = getDogPronouns(pronouns.gender);
      return {
        gender: base.gender,
        subject: typeof pronouns.subject === 'string' ? pronouns.subject : base.subject,
        object: typeof pronouns.object === 'string' ? pronouns.object : base.object,
        possessiveAdjective: typeof pronouns.possessiveAdjective === 'string' ? pronouns.possessiveAdjective : base.possessiveAdjective,
        possessive: typeof pronouns.possessive === 'string' ? pronouns.possessive : base.possessive,
        reflexive: typeof pronouns.reflexive === 'string' ? pronouns.reflexive : base.reflexive,
        noun: typeof pronouns.noun === 'string' ? pronouns.noun : base.noun,
        subjectCapitalized: typeof pronouns.subjectCapitalized === 'string' ? pronouns.subjectCapitalized : base.subjectCapitalized,
        objectCapitalized: typeof pronouns.objectCapitalized === 'string' ? pronouns.objectCapitalized : base.objectCapitalized,
        possessiveAdjectiveCapitalized: typeof pronouns.possessiveAdjectiveCapitalized === 'string' ? pronouns.possessiveAdjectiveCapitalized : base.possessiveAdjectiveCapitalized,
      };
    })();
    
    const context = {
      temperaments: temperaments && Array.isArray(temperaments) ? temperaments : undefined,
      hasUserPreferences: !hasMinimalPrefs,
      pronouns: pronounContext,
      dogName: typeof dogName === 'string' ? dogName : undefined
    };
    
    const messages = buildReasoningMessages(prompt as string, context);

    if (type === 'free') {
      if (process.env.DEBUG_REASONING === '1') {
        console.log(`[${requestId}] [ai-reasoning] FREE prompt:`, prompt);
      }
      // Plain text mode for free-form generation
      const reasoning = await runTextResponse(messages, {
        max_tokens: Math.min(Number(max_tokens || 60), 80),
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.3)) : 0.1,
      });
      const openaiDuration = Date.now() - openaiStartTime;
      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] ⏱️ /api/ai-reasoning (free) total: ${totalDuration}ms`, {
        openaiDuration: `${openaiDuration}ms`,
        type: 'free'
      });
      const responseHeaders = new Headers();
      responseHeaders.set('X-Request-ID', requestId);
      responseHeaders.set('X-Total-Duration', `${totalDuration}`);
      responseHeaders.set('X-OpenAI-Duration', `${openaiDuration}`);
      return NextResponse.json({ reasoning }, { headers: responseHeaders });
    } else if (type === 'top-pick') {
      // Structured response for top picks with JSON schema validation
      const reasoning = await runStructuredResponse(messages, {
        max_tokens: 150,
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.3)) : 0.1,
      });
      const openaiDuration = Date.now() - openaiStartTime;
      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] ⏱️ /api/ai-reasoning (top-pick) total: ${totalDuration}ms`, {
        openaiDuration: `${openaiDuration}ms`,
        type: 'top-pick'
      });
      const responseHeaders = new Headers();
      responseHeaders.set('X-Request-ID', requestId);
      responseHeaders.set('X-Total-Duration', `${totalDuration}`);
      responseHeaders.set('X-OpenAI-Duration', `${openaiDuration}`);
      return NextResponse.json({ reasoning }, { headers: responseHeaders });
    } else {
      // Short response for all matches
      const reasoning = await runTextResponse(messages, {
        max_tokens: 50,
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.3)) : 0.1,
      });
      const openaiDuration = Date.now() - openaiStartTime;
      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] ⏱️ /api/ai-reasoning (short) total: ${totalDuration}ms`, {
        openaiDuration: `${openaiDuration}ms`,
        type: 'short'
      });
      const responseHeaders = new Headers();
      responseHeaders.set('X-Request-ID', requestId);
      responseHeaders.set('X-Total-Duration', `${totalDuration}`);
      responseHeaders.set('X-OpenAI-Duration', `${openaiDuration}`);
      return NextResponse.json({ reasoning: reasoning.substring(0, 50) }, { headers: responseHeaders });
    }

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ AI reasoning API error after ${totalDuration}ms:`, error);
    return NextResponse.json(
      { error: 'Failed to generate AI reasoning' },
      { status: 500 }
    );
  }
}
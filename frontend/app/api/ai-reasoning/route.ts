import { NextRequest, NextResponse } from 'next/server';
import { runStructuredResponse, runTextResponse, isOpenAIConfigured } from '@/lib/openai-client';

export async function POST(request: NextRequest) {
  try {
    const { prompt, type, max_tokens, temperature } = await request.json();
    
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
    
    const systemPrompt = 'You are an expert dog adoption counselor. Provide helpful, accurate, and encouraging recommendations for potential dog adopters. Be specific and reference user preferences by name when possible. Quote or paraphrase the adopter\'s own words when explaining recommendations, and include brief parenthetical citations such as (mentioned: enjoys hiking).';
    
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      { role: 'user' as const, content: prompt as string }
    ];

    if (type === 'free') {
      if (process.env.DEBUG_REASONING === '1') {
        console.log('[ai-reasoning] FREE prompt:', prompt);
      }
      // Plain text mode for free-form generation
      const reasoning = await runTextResponse(messages, {
        max_tokens: Math.min(Number(max_tokens || 80), 120),
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.4)) : 0.2,
      });
      return NextResponse.json({ reasoning });
    } else if (type === 'top-pick') {
      // Structured response for top picks with JSON schema validation
      const reasoning = await runStructuredResponse(messages, {
        max_tokens: 200,
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.4)) : 0.2,
      });
      return NextResponse.json({ reasoning });
    } else {
      // Short response for all matches
      const reasoning = await runTextResponse(messages, {
        max_tokens: 80,
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.4)) : 0.2,
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
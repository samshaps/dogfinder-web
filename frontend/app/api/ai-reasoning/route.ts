import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { tryParseReasoning, tryParseShortReasoning } from '@/utils/parseLLM';

export async function POST(request: NextRequest) {
  try {
    const { prompt, type, max_tokens, temperature } = await request.json();
    
    console.log('🔑 Checking OpenAI API key...');
    if (!process.env.OPENAI_SECRET) {
      console.error('❌ OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI API key found');

    console.log('🤖 Initializing OpenAI client...');
    const client = new OpenAI({
      apiKey: process.env.OPENAI_SECRET,
    });

    console.log('🚀 Calling OpenAI API...');
    const common = {
      model: 'gpt-3.5-turbo' as const,
      messages: [
        {
          role: 'system' as const,
          content: 'You are an expert dog adoption counselor. Provide helpful, accurate, and encouraging recommendations for potential dog adopters. Be specific and reference user preferences by name when possible.'
        },
        { role: 'user' as const, content: prompt as string }
      ],
    };

    const isFree = type === 'free';
    const response = await client.chat.completions.create({
      ...common,
      max_tokens: isFree ? Math.min(Number(max_tokens || 80), 120) : (type === 'top-pick' ? 200 : 80),
      temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 0.4)) : 0.2,
      ...(isFree ? {} : { response_format: { type: 'json_object' as const } })
    });

    const aiResponse = response.choices[0]?.message?.content?.trim();
    console.log('📝 OpenAI raw response:', aiResponse);
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    if (type === 'free') {
      if (process.env.DEBUG_REASONING === '1') {
        console.log('[ai-reasoning] FREE prompt:', prompt);
      }
      // Plain text mode for free-form generation (do not cap by token count here)
      // Let callers enforce their own character limits downstream
      return NextResponse.json({ reasoning: aiResponse });
    } else if (type === 'top-pick') {
      // Parse JSON response for top picks with intelligent parsing
      const parsed = tryParseReasoning(aiResponse);
      if (parsed) {
        return NextResponse.json({ reasoning: parsed });
      } else {
        // If parsing fails, create a structured response
        const reasoning = {
          primary: aiResponse.substring(0, 150),
          additional: [],
          concerns: []
        };
        return NextResponse.json({ reasoning });
      }
    } else {
      // Return short response for all matches with intelligent parsing
      const parsed = tryParseShortReasoning(aiResponse);
      const shortReasoning = parsed || aiResponse.substring(0, 50);
      return NextResponse.json({ reasoning: shortReasoning });
    }

  } catch (error) {
    console.error('AI reasoning API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI reasoning' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { tryParseReasoning, tryParseShortReasoning } from '@/utils/parseLLM';

export async function POST(request: NextRequest) {
  try {
    const { prompt, type } = await request.json();
    
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
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert dog adoption counselor. Provide helpful, accurate, and encouraging recommendations for potential dog adopters. Always respond in the exact format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: type === 'top-pick' ? 300 : 100,
      temperature: 0.7,
      // Request structured output for better JSON parsing
      response_format: type === 'top-pick' ? { type: "json_object" } : undefined
    });

    const aiResponse = response.choices[0]?.message?.content?.trim();
    console.log('📝 OpenAI raw response:', aiResponse);
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    if (type === 'top-pick') {
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

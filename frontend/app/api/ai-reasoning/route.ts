import { NextRequest, NextResponse } from 'next/server';

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
    const openai = require('openai');
    const client = new openai.OpenAI({
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
    });

    const aiResponse = response.choices[0]?.message?.content?.trim();
    console.log('📝 OpenAI raw response:', aiResponse);
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    if (type === 'top-pick') {
      // Parse JSON response for top picks
      try {
        const reasoning = JSON.parse(aiResponse);
        return NextResponse.json({ reasoning });
      } catch (parseError) {
        // If JSON parsing fails, create a structured response
        const reasoning = {
          primary: aiResponse.substring(0, 150),
          additional: [],
          concerns: []
        };
        return NextResponse.json({ reasoning });
      }
    } else {
      // Return short response for all matches
      const shortReasoning = aiResponse.substring(0, 50);
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

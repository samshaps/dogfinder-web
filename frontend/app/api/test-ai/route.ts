import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    console.log('🧪 Testing OpenAI API key...');
    
    if (!process.env.OPENAI_SECRET) {
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not found in environment variables' 
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_SECRET,
    });

    // Simple test call
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say 'AI is working!' in exactly 3 words."
        }
      ],
      max_tokens: 10,
    });

    const aiResponse = response.choices[0]?.message?.content?.trim();
    
    return NextResponse.json({ 
      success: true, 
      message: 'OpenAI API is working!',
      response: aiResponse
    });

  } catch (error) {
    console.error('❌ OpenAI test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

import { NextResponse } from 'next/server';
import { runTextResponse } from '@/lib/openai-client';

export async function GET() {
  try {
    console.log('🧪 Testing OpenAI Responses API...');

    // Simple test call using the shared helper
    const aiResponse = await runTextResponse([
      {
        role: "user",
        content: "Say 'AI is working!' in exactly 3 words."
      }
    ], {
      model: "gpt-4o-mini",
      max_tokens: 10,
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'OpenAI Responses API is working!',
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

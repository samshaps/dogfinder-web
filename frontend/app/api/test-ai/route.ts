import { NextRequest, NextResponse } from 'next/server';
import { runTextResponse, runStructuredResponse } from '@/lib/openai-client';

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

export async function POST(request: NextRequest) {
  try {
    const { prompt, type, temperaments } = await request.json();
    
    console.log('🧪 Testing temperament-aware AI reasoning...');
    console.log('📝 Prompt:', prompt);
    console.log('🎭 Temperaments:', temperaments);
    
    // Build temperament-aware system prompt
    let systemPrompt = 'You are an expert dog adoption counselor. Provide helpful, accurate, and encouraging recommendations for potential dog adopters. Be specific and reference user preferences by name when possible. Quote or paraphrase the adopter\'s own words when explaining recommendations, and include brief parenthetical citations such as (mentioned: enjoys hiking).';
    
    if (temperaments && Array.isArray(temperaments) && temperaments.length > 0) {
      systemPrompt += `\n\nTEMPERAMENT REQUIREMENTS: You must consider the adopter's stated temperament preferences when recommending breeds. Cross-reference the adopter's requested temperaments with dog breeds known for those traits. Prioritize breeds whose typical dispositions align with the requested temperaments. Explain why each recommended breed fits by referencing known temperament traits (e.g., "Border Collies are energetic and eager to work"). Explicitly cite the adopter's preference text in parentheses, such as (requested temperament: "calm and patient").`;
    }
    
    // Build user message with temperament context
    let userMessage = prompt || 'Test prompt for temperament reasoning';
    if (temperaments && Array.isArray(temperaments) && temperaments.length > 0) {
      userMessage += `\n\nAdopter's temperament preferences: ${temperaments.join(', ')}`;
    }
    
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      { role: 'user' as const, content: userMessage }
    ];

    if (type === 'top-pick') {
      // Test structured response with temperament awareness
      const reasoning = await runStructuredResponse(messages, {
        max_tokens: 200,
        temperature: 0.2,
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Temperament-aware top-pick reasoning test completed',
        reasoning,
        temperaments: temperaments || []
      });
    } else {
      // Test free-form response
      const reasoning = await runTextResponse(messages, {
        max_tokens: 100,
        temperature: 0.2,
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Temperament-aware free-form reasoning test completed',
        reasoning,
        temperaments: temperaments || []
      });
    }

  } catch (error) {
    console.error('❌ Temperament test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

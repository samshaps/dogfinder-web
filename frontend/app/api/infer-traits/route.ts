import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export type InferredTraits = {
  energy?: 'low'|'medium'|'high'|null;
  barky?: boolean|null;
  kidFriendly?: 'yes'|'no'|'unknown';
  apartmentOk?: boolean|null;
  evidence: { field: string; quote: string }[];
  confidence: number; // 0..1
};

export async function POST(req: NextRequest) {
  try {
    const { description, tags } = await req.json();
    if (!process.env.OPENAI_SECRET) {
      return NextResponse.json({ error: 'OPENAI_SECRET not configured' }, { status: 500 });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_SECRET });

    const prompt = `You are an adoption trait extractor. Read a dog's description and tags. Extract structured traits supported by text.

Return JSON with this schema:
{
  "energy": "low"|"medium"|"high" | null,
  "barky": true|false | null,
  "kidFriendly": "yes"|"no"|"unknown",
  "apartmentOk": true|false | null,
  "evidence": [{ "field": string, "quote": string }][],
  "confidence": number
}

Guidelines:
- Only claim traits that have direct textual support. Do not guess.
- Include short evidence quotes from the description/tags.
- Examples:
  * "couch potato", "calm", "relaxed" → "energy":"low"
  * "energetic", "needs lots of exercise" → "energy":"high"
  * "barks a lot", "vocal", "alert watchdog" → "barky":true
  * "great with kids", "kid friendly" → "kidFriendly":"yes"
  * "not good with children" → "kidFriendly":"no"
  * "good for apartments", "apartment friendly" → "apartmentOk":true
- If a trait is not supported by text, omit or set to null/unknown.
- Always include evidence for any extracted trait.
- Confidence is your self-assessment of accuracy, 0.0 to 1.0.

Description: ${description || ''}
Tags: ${Array.isArray(tags) ? tags.join(', ') : (tags || '')}

Output JSON only. No prose.`;

    const resp = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You extract dog adoption traits into structured JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 350,
    });
    const text = resp.choices[0]?.message?.content?.trim() || '{}';
    let parsed: InferredTraits;
    try { parsed = JSON.parse(text); } catch { parsed = { evidence: [], confidence: 0 } as any; }
    if (!parsed.evidence) parsed.evidence = [];
    if (typeof parsed.confidence !== 'number') parsed.confidence = 0.5;
    return NextResponse.json(parsed as InferredTraits);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'infer-traits failed' }, { status: 500 });
  }
}



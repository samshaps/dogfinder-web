import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export type NormPrefs = {
  age?: Array<'puppy'|'young'|'adult'|'senior'>;
  size?: Array<'small'|'medium'|'large'>;
  energy?: 'low'|'medium'|'high'|null;
  temperament?: string[];
  notes?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const { guidance } = await req.json();
    if (!process.env.OPENAI_SECRET) {
      return NextResponse.json({ error: 'OPENAI_SECRET not configured' }, { status: 500 });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_SECRET });

    const prompt = `You are an adoption preference normalizer. Convert a messy free-text user note into structured adoption preferences.

Return JSON with this schema:
{
  "age": ["puppy"|"young"|"adult"|"senior"]?,
  "size": ["small"|"medium"|"large"]?,
  "energy": "low"|"medium"|"high"|null,
  "temperament": [string]?,
  "notes": [string]?
}

Guidelines:
- Map synonyms explicitly. Examples:
  * "big" or "giant" → "large"
  * "small", "tiny", "toy" → "small"
  * "medium-sized" → "medium"
  * "chill", "calm", "laid-back", "relaxed", "easygoing", "low key" → "low" energy
  * "active", "energetic", "high energy" → "high" energy
- Only include traits clearly mentioned. Do not guess.
- If nothing is mentioned for a category, omit it.
- Always include a "notes" array describing your mappings.

User note: ${guidance || ''}

Output JSON only. No prose.`;

    const resp = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You normalize adoption preferences to structured JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });
    const text = resp.choices[0]?.message?.content?.trim() || '{}';
    let parsed: NormPrefs;
    try { parsed = JSON.parse(text); } catch { parsed = {}; }
    return NextResponse.json(parsed as NormPrefs);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'normalize-guidance failed' }, { status: 500 });
  }
}



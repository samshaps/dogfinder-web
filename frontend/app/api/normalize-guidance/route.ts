import { NextRequest, NextResponse } from 'next/server';
import { runResponse } from '@/lib/openai-client';

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

    const response = await runResponse({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You normalize adoption preferences to structured JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    let parsed: NormPrefs;
    try { 
      parsed = JSON.parse(response.output_text); 
    } catch { 
      parsed = {}; 
    }
    return NextResponse.json(parsed as NormPrefs);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'normalize-guidance failed' }, { status: 500 });
  }
}



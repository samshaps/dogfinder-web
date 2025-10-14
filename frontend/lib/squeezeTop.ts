const SHORTFORMS: Array<[RegExp, string]> = [
  [/kid[-\s]?friendly/gi, 'kid-friendly'],
  [/cat[-\s]?friendly/gi, 'cat-friendly'],
  [/low maintenance/gi, 'low-maintenance'],
  [/moderate energy/gi, 'medium energy'],
  [/not barky/gi, 'quiet'],
  [/\s*,\s*/g, ', '],
  [/\s*—\s*/g, ' — '],
  [/\s+/g, ' '],
];

export function squeezeTop(text: string, max: number): string {
  let s = String(text || '').trim().replace(/[.]+$/, '.');
  for (const [re, sub] of SHORTFORMS) s = s.replace(re, sub);
  if (s.length <= max) return s;
  const hard = s.slice(0, max);
  const cut = hard.lastIndexOf(' ');
  return (cut > 0 ? hard.slice(0, cut) : hard).trim();
}



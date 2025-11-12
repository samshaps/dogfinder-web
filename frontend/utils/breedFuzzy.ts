export type CanonicalMatch = {
  canonical: string;
  reasons: string[];
};

export type BreedExpansion = {
  expanded: string[];
  notes: string[];
};

const STOPWORDS = new Set(["dog","mix","mutt","puppy","adult","senior","young","mini","standard","toy"]);
const DICTIONARY = [
  "poodle","labrador retriever","golden retriever","german shepherd","shepherd",
  "yorkshire terrier","terrier","cane corso","pit bull","american pit bull terrier",
  "staffordshire bull terrier","american bully","boxer","australian shepherd","border collie",
  "greyhound","italian greyhound","whippet","maltese","havanese","bichon frise","shih tzu",
  "coton de tulear","lagotto romagnolo","schnauzer","soft coated wheaten terrier",
  "bernese mountain dog","newfoundland","great pyrenees","husky","siberian husky","alaskan malamute",
  "doberman pinscher","rottweiler","great dane","bulldog","french bulldog","boston terrier",
  "beagle","dachshund","chihuahua","miniature pinscher","pomeranian","collie","shetland sheepdog",
  "akita","mastiff","portuguese water dog","wheaten terrier"
];

const ALIASES: Record<string,string> = {
  "lab": "labrador retriever",
  "lab mix": "labrador retriever",
  "labrador mix": "labrador retriever",
  "lab-x": "labrador retriever",
  "labx": "labrador retriever",
  "lab retriever": "labrador retriever",
  "lab retriever mix": "labrador retriever",
  "golden": "golden retriever",
  "gsd": "german shepherd",
  "yorkie": "yorkshire terrier",
  "amstaff": "american pit bull terrier",
  "pit": "american pit bull terrier",
  "pitbull": "american pit bull terrier",
  "shepherd mix": "shepherd",
  "doodle": "poodle",
  "goldendoodle": "poodle",
  "labradoodle": "poodle",
  "bernedoodle": "poodle",
  "sheepadoodle": "poodle",
  "aussiedoodle": "poodle",
  "poodle mix": "poodle",
};

// Doodle family expansion
const DOODLE_FAMILY = [
  "goldendoodle", "labradoodle", "bernedoodle", "sheepadoodle", "aussiedoodle", 
  "poodle mix", "poodle", "doodle"
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-/g, " ") // Convert hyphens to spaces for better matching
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string) {
  return normalize(s).split(" ").filter(t => t && !STOPWORDS.has(t));
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const uni = new Set([...a, ...b]).size || 1;
  return inter / uni;
}

function bestCanonical(term: string): CanonicalMatch | null {
  const orig = normalize(term);
  const reasons: string[] = [];
  if (ALIASES[orig]) {
    reasons.push(`alias:${orig}→${ALIASES[orig]}`);
    return { canonical: ALIASES[orig], reasons };
  }
  if (/doodle/.test(orig)) {
    reasons.push("family:doodle→poodle");
    return { canonical: "poodle", reasons };
  }
  const tTok = tokenize(orig);
  let best = { name: "", score: 0 };
  for (const cand of DICTIONARY) {
    const score = jaccard(tTok, tokenize(cand));
    if (score > best.score) best = { name: cand, score };
  }
  if (best.score >= 0.34) {
    reasons.push(`fuzzy:${best.score.toFixed(2)}`);
    return { canonical: best.name, reasons };
  }
  return null;
}

// Enhanced function to expand user breed terms with comprehensive doodle support
export function expandUserBreeds(terms: string[]): BreedExpansion {
  const expanded: string[] = [];
  const notes: string[] = [];
  
  for (const term of terms) {
    const normalized = normalize(term);
    
    // Handle doodle family expansion
    if (/doodle/i.test(normalized)) {
      // Always expand "doodles" to the full family
      expanded.push(...DOODLE_FAMILY);
      notes.push(`'${term}' → ${DOODLE_FAMILY.join(', ')}`);
      continue;
    }
    
    // Handle direct aliases
    if (ALIASES[normalized]) {
      expanded.push(ALIASES[normalized]);
      notes.push(`'${term}' → ${ALIASES[normalized]}`);
      continue;
    }
    
    // Handle fuzzy matching
    const canonical = bestCanonical(term);
    if (canonical) {
      expanded.push(canonical.canonical);
      notes.push(`'${term}' → ${canonical.canonical} (${canonical.reasons.join(', ')})`);
      continue;
    }
    
    // If no match found, include the original term
    expanded.push(term);
  }
  
  // Remove duplicates while preserving order
  const uniqueExpanded = [...new Set(expanded)];
  
  return {
    expanded: uniqueExpanded,
    notes
  };
}

// Legacy function for backward compatibility
export function expandUserBreedsLegacy(inputs: string[] = []) {
  const results: { canonical: string; reasons: string[] }[] = [];
  for (const raw of inputs) {
    const m = bestCanonical(raw);
    if (m) results.push(m);
  }
  const seen = new Set<string>();
  return results.filter(r => (seen.has(r.canonical) ? false : (seen.add(r.canonical), true)));
}

// Enhanced breedHit function with better matching logic
export function breedHit(dogBreeds: string[], expanded: string[]): boolean {
  if (!dogBreeds || dogBreeds.length === 0 || !expanded || expanded.length === 0) {
    return false;
  }
  
  const dogBreedsNormalized = dogBreeds.map(normalize);
  const expandedNormalized = expanded.map(normalize);
  
  // Check for exact matches first
  for (const dogBreed of dogBreedsNormalized) {
    for (const expandedBreed of expandedNormalized) {
      if (dogBreed === expandedBreed) {
        return true;
      }
    }
  }
  
  // Check for fuzzy matches using Jaccard similarity
  for (const dogBreed of dogBreedsNormalized) {
    const dogTokens = tokenize(dogBreed);
    for (const expandedBreed of expandedNormalized) {
      const expandedTokens = tokenize(expandedBreed);
      const similarity = jaccard(dogTokens, expandedTokens);
      
      // Lower threshold for better matching
      if (similarity >= 0.3) {
        return true;
      }
      
      // Check for substring matches (case-insensitive)
      if (dogBreed.includes(expandedBreed) || expandedBreed.includes(dogBreed)) {
        return true;
      }
      
      // Check for space-separated matches (e.g., "golden doodle" vs "goldendoodle")
      const dogBreedNoSpaces = dogBreed.replace(/\s+/g, '');
      const expandedBreedNoSpaces = expandedBreed.replace(/\s+/g, '');
      if (dogBreedNoSpaces === expandedBreedNoSpaces) {
        return true;
      }
    }
  }
  
  return false;
}

// Legacy function for backward compatibility
export function breedHitLegacy(dog: { breeds: string[]; tags?: string[]; description?: string }, canon: string) {
  const fields = [
    ...(dog.breeds || []),
    ...(dog.tags || []),
    ...(dog.description ? [dog.description] : []),
  ].map(normalize);
  const cTok = tokenize(canon);
  const threshold = 0.34;
  return fields.some(f => jaccard(tokenize(f), cTok) >= threshold || f.includes(normalize(canon)));
}


// =============================
// V2 fuzzy and mix-friendly API
// =============================

// Base normalizer reused across helpers
function normalizeBaseV2(s: string) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\/-]/g, ' ')
    .replace(/[\/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Minimal dictionaries for synonyms and families (extendable)
const SYNONYMS_V2: Record<string, string> = {
  'lab': 'labrador retriever',
  'lab retriever': 'labrador retriever',
  'gsd': 'german shepherd',
  'german sheperd': 'german shepherd',
  'german sheperdd': 'german shepherd',
  'shep': 'shepherd',
  'golden': 'golden retriever',
  'yorkie': 'yorkshire terrier',
  'amstaff': 'american pit bull terrier',
  'pit': 'american pit bull terrier',
  'pitbull': 'american pit bull terrier',
  'pibble': 'american pit bull terrier',
  'golden doodle': 'goldendoodle',
  'golden-doodle': 'goldendoodle',
  'golden poodle': 'goldendoodle',
  'doodle': 'poodle',
};

const BREED_FAMILIES_V2: Record<string, string[]> = {
  'labrador retriever': ['labrador retriever','lab','goldador','labradoodle','goldendoodle'],
  'golden retriever': ['golden retriever','golden','goldador','goldendoodle'],
  'german shepherd': ['german shepherd','shepherd','gsd','malinois'],
  'poodle': ['poodle','doodle','labradoodle','goldendoodle','bernedoodle','sheepadoodle','aussiedoodle'],
};

export function normalizeQueryV2(s: string): { text: string; isMix: boolean } {
  const base = normalizeBaseV2(s);
  let t = base
    .replace(/\blab\b/g, 'labrador')
    .replace(/\bgsd\b/g, 'german shepherd')
    .replace(/\baussie\b/g, 'australian shepherd')
    .replace(/\bgolden\s*doodle\b/g, 'goldendoodle')
    .replace(/\bgolden\s*poodle\b/g, 'goldendoodle')
    .replace(/\bpit\b/g, 'american pit bull terrier')
    .replace(/\bshep\b/g, 'shepherd');
  const isMix = /(\bmix\b|\bx\b|\bcross\b)/.test(t);
  t = t.replace(/\b(mix|x|cross)\b/g, ' ').replace(/\s+/g, ' ').trim();
  return { text: t, isMix };
}

// Trigram cosine similarity
function trigramsV2(s: string): string[] {
  const str = `  ${normalizeBaseV2(s)} `;
  const grams: string[] = [];
  for (let i = 0; i < str.length - 2; i++) grams.push(str.slice(i, i + 3));
  return grams;
}
function cosineSimV2(a: string, b: string): number {
  const A = trigramsV2(a);
  const B = trigramsV2(b);
  const mapA = new Map<string, number>();
  const mapB = new Map<string, number>();
  for (const g of A) mapA.set(g, (mapA.get(g) || 0) + 1);
  for (const g of B) mapB.set(g, (mapB.get(g) || 0) + 1);
  const keys = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  let dot = 0, normA = 0, normB = 0;
  for (const k of keys) {
    const va = mapA.get(k) || 0;
    const vb = mapB.get(k) || 0;
    dot += va * vb;
  }
  for (const v of mapA.values()) normA += v * v;
  for (const v of mapB.values()) normB += v * v;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// Levenshtein edit distance
function editDistanceV2(a: string, b: string): number {
  const s = normalizeBaseV2(a), t = normalizeBaseV2(b);
  const dp: number[][] = Array.from({ length: s.length + 1 }, () => Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i++) dp[i][0] = i;
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[s.length][t.length];
}

// Candidate scoring: phonetic bucket (approx), edit distance, cosine
function scoreCandidateV2(term: string, candidate: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  // crude phonetic bucket: strip vowels and common pairs
  const bucket = (w: string) => normalizeBaseV2(w).replace(/[aeiou]/g, '').replace(/ph/g, 'f').replace(/sh/g, 'x').slice(0, 8);
  const tb = bucket(term), cb = bucket(candidate);
  const phon = tb === cb;
  if (phon) reasons.push('phonetic');
  const ed = editDistanceV2(term, candidate);
  const limit = normalizeBaseV2(term).length <= 8 ? 2 : 3;
  const edOk = ed <= limit;
  if (edOk) reasons.push(`edit:${ed}`);
  const cos = cosineSimV2(term, candidate);
  const cosOk = cos >= 0.72;
  if (cosOk) reasons.push(`cos:${cos.toFixed(2)}`);
  const score = (phon ? 1.0 : 0) + (edOk ? 0.6 : 0) + (cosOk ? 0.4 : 0) + Math.min(cos, 1) * 0.2;
  return { score, reasons };
}

// New expansion honoring mix → include families
export function expandUserBreedsV2(terms: string[]): BreedExpansion {
  const expanded: string[] = [];
  const notes: string[] = [];
  for (const raw of terms) {
    const { text, isMix } = normalizeQueryV2(raw);
    const normalizedRaw = normalizeBaseV2(raw);

    if (normalizedRaw.includes('doodle')) {
      expanded.push(...DOODLE_FAMILY);
      notes.push(`'${raw}' → doodle family (${DOODLE_FAMILY.join(', ')})`);
      continue;
    }

    const alias = SYNONYMS_V2[text];
    if (alias) {
      expanded.push(alias);
      if (isMix) expanded.push(...(BREED_FAMILIES_V2[alias] || []));
      notes.push(isMix ? `mix: '${raw}' → ${alias} family` : `'${raw}' → ${alias}`);
      continue;
    }
    // pick best among a small candidate set (use existing DICTIONARY as a base list)
    let best: { name: string; score: number; reasons: string[] } | null = null;
    for (const cand of DICTIONARY) {
      const { score, reasons } = scoreCandidateV2(text, cand);
      if (!best || score > best.score) best = { name: cand, score, reasons };
    }
    if (best && best.score >= 0.8) {
      expanded.push(best.name);
      if (isMix) expanded.push(...(BREED_FAMILIES_V2[best.name] || []));
      notes.push(isMix ? `mix: '${raw}' → ${best.name} family` : `'${raw}' → ${best.name} (${best.reasons.join(', ')})`);
      continue;
    }
    // fallback keep normalized
    expanded.push(text);
  }
  const uniqueExpanded = [...new Set(expanded.map(normalizeBaseV2))];
  return { expanded: uniqueExpanded, notes };
}

// Dog-aware hit producing tiers for scoring and ranking
export function dogBreedHit(
  dog: { breeds: string[]; tags?: string[]; rawDescription?: string },
  expanded: string[]
): { hit: boolean; tier?: number; reason?: string } {
  if (!expanded?.length) return { hit: true, tier: 99, reason: 'no-filter' };
  const fields: string[] = [
    ...(dog.breeds || []),
    ...((dog.tags || []).filter(Boolean)),
    ...(dog.rawDescription ? [dog.rawDescription] : [])
  ].map(normalizeBaseV2);
  const want = expanded.map(normalizeBaseV2);

  // Tier 1: exact canonical
  for (const f of fields) for (const w of want) if (f === w) return { hit: true, tier: 1, reason: 'exact' };
  // Tier 2: alias exact
  for (const f of fields) {
    const syn = SYNONYMS_V2[f];
    if (syn && want.includes(syn)) return { hit: true, tier: 2, reason: 'alias' };
  }
  // Tier 3: family
  for (const w of want) {
    const fam = BREED_FAMILIES_V2[w];
    if (fam && fields.some(f => fam.includes(f))) return { hit: true, tier: 3, reason: 'family' };
  }
  // Tier 4: phonetic/edit
  for (const f of fields) for (const w of want) {
    const ev = scoreCandidateV2(f, w);
    if (ev.score >= 0.8) return { hit: true, tier: 4, reason: ev.reasons.join('|') };
  }
  // Tier 5: ngram
  for (const f of fields) for (const w of want) if (cosineSimV2(f, w) >= 0.72) return { hit: true, tier: 5, reason: 'ngram' };
  return { hit: false };
}

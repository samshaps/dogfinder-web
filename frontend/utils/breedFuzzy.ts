export type CanonicalMatch = {
  canonical: string;
  reasons: string[];
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
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
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

export function expandUserBreeds(inputs: string[] = []) {
  const results: { canonical: string; reasons: string[] }[] = [];
  for (const raw of inputs) {
    const m = bestCanonical(raw);
    if (m) results.push(m);
  }
  const seen = new Set<string>();
  return results.filter(r => (seen.has(r.canonical) ? false : (seen.add(r.canonical), true)));
}

export function breedHit(dog: { breeds: string[]; tags?: string[]; description?: string }, canon: string) {
  const fields = [
    ...(dog.breeds || []),
    ...(dog.tags || []),
    ...(dog.description ? [dog.description] : []),
  ].map(normalize);
  const cTok = tokenize(canon);
  const threshold = 0.34;
  return fields.some(f => jaccard(tokenize(f), cTok) >= threshold || f.includes(normalize(canon)));
}



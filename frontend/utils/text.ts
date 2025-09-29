// Text utilities for deduplication and contradiction removal

export function dedupeChips(labels: string[]): string[] {
  const seen = new Set<string>();
  return labels.filter(label => {
    const normalized = label.toLowerCase().trim();
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

// Common negation pairs
const negationPairs: Record<string, string> = {
  "hypoallergenic": "not hypoallergenic",
  "good with kids": "not good with kids",
  "quiet": "vocal",
  "low energy": "high energy",
  "small": "large",
  "adult": "puppy",
  "house trained": "not house trained"
};

// Practical concern phrasing
const concernPhrases: Record<string, string> = {
  "not hypoallergenic": "This dog is a shedding breed and does not meet your hypoallergenic requirement",
  "not good with kids": "This dog may not be suitable for families with children",
  "vocal": "This dog tends to be vocal and may not be suitable for apartment living",
  "high energy": "This dog has high energy needs that may not match your lifestyle",
  "puppy": "This puppy will require significant training and attention",
  "large": "This dog's size may not be suitable for your living space",
  "not house trained": "This dog will require house training"
};

// Positive affirmation phrases for OR logic
const positivePhrases: Record<string, string> = {
  "adult": "Adult is within your preferences",
  "young": "Young is within your preferences", 
  "baby": "Baby is within your preferences",
  "senior": "Senior is within your preferences",
  "small": "Small is within your preferences",
  "medium": "Medium is within your preferences",
  "large": "Large is within your preferences",
  "xl": "XL is within your preferences",
  "hypoallergenic": "Hypoallergenic meets your requirements",
  "good with kids": "Good with kids meets your requirements",
  "quiet": "Quiet temperament meets your requirements"
};

export function improveConcernPhrasing(concern: string): string {
  const normalized = concern.toLowerCase().trim();
  
  // Check for exact matches first
  if (concernPhrases[normalized]) {
    return concernPhrases[normalized];
  }
  
  // Check for partial matches
  for (const [key, phrase] of Object.entries(concernPhrases)) {
    if (normalized.includes(key)) {
      return phrase;
    }
  }
  
  // Return original if no improvement found
  return concern;
}

export function improveMatchPhrasing(match: string): string {
  const normalized = match.toLowerCase().trim();
  
  // Check for exact matches first
  if (positivePhrases[normalized]) {
    return positivePhrases[normalized];
  }
  
  // Check for partial matches
  for (const [key, phrase] of Object.entries(positivePhrases)) {
    if (normalized.includes(key)) {
      return phrase;
    }
  }
  
  // Return original if no improvement found
  return match;
}

export function removeContradictions(matches: string[], concerns: string[]): { matches: string[]; concerns: string[] } {
  const cleanMatches = [...matches];
  const cleanConcerns = [...concerns];
  
  // Check for contradictions
  for (const match of matches) {
    const normalizedMatch = match.toLowerCase().trim();
    
    // Check if this match has a negation in concerns
    for (const [positive, negative] of Object.entries(negationPairs)) {
      if (normalizedMatch.includes(positive) && concerns.some(c => c.toLowerCase().includes(negative))) {
        // Remove the positive from matches
        const index = cleanMatches.indexOf(match);
        if (index > -1) {
          cleanMatches.splice(index, 1);
        }
        break;
      }
    }
  }
  
  return { matches: cleanMatches, concerns: cleanConcerns };
}

export function normalizeChipText(text: string): string {
  return text.toLowerCase().trim();
}

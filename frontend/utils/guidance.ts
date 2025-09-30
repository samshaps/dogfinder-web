// Guidance tokenization utilities

export type GuidanceTokens = {
  age: { puppy: boolean; young: boolean; adult: boolean; senior: boolean };
  size: { small: boolean; medium: boolean; large: boolean; apartment: boolean };
  energy: { low: boolean; medium: boolean; high: boolean; active: boolean; lowMaint: boolean };
  temperament: { hypoallergenic: boolean; quiet: boolean; goodWithKids: boolean; catFriendly: boolean };
  flags: { 
    lowMaintenance: boolean; 
    firstTimeOwner: boolean; 
    apartmentOk: boolean; 
    quietPreferred: boolean; 
    kidFriendly: boolean; 
    catFriendly: boolean;
  };
};

export function tokenizeGuidance(g?: string): GuidanceTokens {
  const s = (g || "").toLowerCase();
  const has = (...xs: string[]) => xs.some(x => s.includes(x));
  
  return {
    age: {
      puppy: has("puppy", "baby"),
      young: has("young"),
      adult: has("adult"),
      senior: has("senior", "older"),
    },
    size: {
      small: has("small", "toy", "puppy"),
      medium: has("medium", "medium-sized"),
      large: has("large", "big"),
      apartment: has("apartment", "condo", "small space"),
    },
    energy: {
      low: has("low energy", "calm", "laid back", "chill"),
      medium: has("moderate energy", "medium energy", "balanced"),
      high: has("high energy", "energetic", "active dog"),
      active: has("active", "hike", "runner", "exercise", "jog"),
      lowMaint: has("low-maintenance", "low maintenance", "easy care"),
    },
    temperament: {
      hypoallergenic: has("hypoallergenic", "allergy", "allergies", "non-shedding"),
      quiet: has("quiet", "not barky", "calm", "not vocal", "doesn't bark"),
      goodWithKids: has("good with kids", "kid", "family", "children", "child-friendly"),
      catFriendly: has("cat", "cats", "feline", "good with cats"),
    },
    flags: {
      lowMaintenance: has("low-maintenance", "low maintenance", "first-time", "retired", "easy care", "minimal grooming"),
      firstTimeOwner: has("first-time", "first time", "beginner", "new to dogs", "never had a dog"),
      apartmentOk: has("apartment", "condo", "small space", "urban", "city"),
      quietPreferred: has("quiet", "not barky", "calm", "not vocal", "doesn't bark", "silent"),
      kidFriendly: has("good with kids", "kid", "family", "children", "child-friendly", "family dog"),
      catFriendly: has("cat", "cats", "feline", "good with cats", "cat compatible"),
    },
  };
}

// Extract structured hints from guidance text
export function extractGuidanceHints(g?: string): {
  ageHints: string[];
  sizeHints: string[];
  energyHints: string[];
  temperamentHints: string[];
  flagHints: string[];
} {
  const tokens = tokenizeGuidance(g);
  const hints: string[] = [];
  
  // Age hints
  const ageHints: string[] = [];
  if (tokens.age.puppy) ageHints.push("puppy");
  if (tokens.age.young) ageHints.push("young");
  if (tokens.age.adult) ageHints.push("adult");
  if (tokens.age.senior) ageHints.push("senior");
  
  // Size hints
  const sizeHints: string[] = [];
  if (tokens.size.small) sizeHints.push("small");
  if (tokens.size.medium) sizeHints.push("medium");
  if (tokens.size.large) sizeHints.push("large");
  if (tokens.size.apartment) sizeHints.push("apartment-sized");
  
  // Energy hints
  const energyHints: string[] = [];
  if (tokens.energy.low) energyHints.push("low energy");
  if (tokens.energy.medium) energyHints.push("medium energy");
  if (tokens.energy.high) energyHints.push("high energy");
  if (tokens.energy.active) energyHints.push("active");
  if (tokens.energy.lowMaint) energyHints.push("low maintenance");
  
  // Temperament hints
  const temperamentHints: string[] = [];
  if (tokens.temperament.hypoallergenic) temperamentHints.push("hypoallergenic");
  if (tokens.temperament.quiet) temperamentHints.push("quiet");
  if (tokens.temperament.goodWithKids) temperamentHints.push("kid-friendly");
  if (tokens.temperament.catFriendly) temperamentHints.push("cat-friendly");
  
  // Flag hints
  const flagHints: string[] = [];
  if (tokens.flags.lowMaintenance) flagHints.push("low maintenance");
  if (tokens.flags.firstTimeOwner) flagHints.push("first-time owner");
  if (tokens.flags.apartmentOk) flagHints.push("apartment suitable");
  if (tokens.flags.quietPreferred) flagHints.push("quiet preferred");
  if (tokens.flags.kidFriendly) flagHints.push("kid-friendly");
  if (tokens.flags.catFriendly) flagHints.push("cat-friendly");
  
  return {
    ageHints,
    sizeHints,
    energyHints,
    temperamentHints,
    flagHints,
  };
}



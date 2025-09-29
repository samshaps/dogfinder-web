// Guidance tokenization utilities

export type GuidanceTokens = {
  age: { puppy: boolean; young: boolean; adult: boolean; senior: boolean };
  size: { small: boolean; medium: boolean; large: boolean; apartment: boolean };
  energy: { low: boolean; medium: boolean; high: boolean; active: boolean; lowMaint: boolean };
  temperament: { hypoallergenic: boolean; quiet: boolean; goodWithKids: boolean };
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
      small: has("small", "toy"),
      medium: has("medium"),
      large: has("large", "big"),
      apartment: has("apartment"),
    },
    energy: {
      low: has("low energy", "calm"),
      medium: has("moderate energy", "medium energy"),
      high: has("high energy", "energetic"),
      active: has("active", "hike", "runner"),
      lowMaint: has("low-maintenance", "first-time", "retired"),
    },
    temperament: {
      hypoallergenic: has("hypoallergenic", "allergy"),
      quiet: has("quiet", "not barky", "calm"),
      goodWithKids: has("good with kids", "kid", "family"),
    },
  };
}



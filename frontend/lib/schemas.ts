import { z } from 'zod';

// Input schemas
export const UserPreferencesSchema = z.object({
  zipCodes: z.array(z.string()).min(1),          // ["10001","07030"]
  radiusMi: z.number().default(50),              // search radius
  breedsInclude: z.array(z.string()).optional(),
  breedsExclude: z.array(z.string()).optional(),
  age: z.array(z.enum(["baby","young","adult","senior"])).optional(),
  size: z.array(z.enum(["small","medium","large","xl"])).optional(),
  energy: z.enum(["low","medium","high"]).optional(),
  temperament: z.array(z.enum([
    "eager-to-please", "intelligent", "focused", "adaptable", "independent-thinker",
    "loyal", "protective", "confident", "gentle", "sensitive",
    "playful", "calm-indoors", "alert-watchful", "quiet", "companion-driven"
  ])).optional(),
  guidance: z.string().optional(),
  touched: z.object({
    age: z.boolean().optional(),
    size: z.boolean().optional(),
    energy: z.boolean().optional(),
    temperament: z.boolean().optional(),
    breedsInclude: z.boolean().optional(),
    breedsExclude: z.boolean().optional(),
  }).optional()
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// Normalized output types
export type Origin = "user" | "guidance" | "default";
export type FieldWithOrigin<T> = { value: T; origin: Origin };

export type EffectivePreferences = {
  zipCodes: string[];
  radiusMi: number;
  breeds: { 
    include: string[]; 
    exclude: string[]; 
    expandedInclude: string[]; 
    expandedExclude: string[]; 
    notes: string[]; 
    origin: Origin 
  };
  age: FieldWithOrigin<("baby"|"young"|"adult"|"senior")[]>;
  size: FieldWithOrigin<("small"|"medium"|"large"|"xl")[]>;
  energy?: FieldWithOrigin<"low"|"medium"|"high">;
  temperament: FieldWithOrigin<string[]>;
  flags: { 
    lowMaintenance?: boolean; 
    firstTimeOwner?: boolean; 
    apartmentOk?: boolean; 
    quietPreferred?: boolean; 
    kidFriendly?: boolean; 
    catFriendly?: boolean; 
  } & Record<string, boolean>;
};

// Dog type (enhanced from existing)
export type Dog = {
  id: string;
  name: string;
  breeds: string[];
  age: string;
  size: string;
  energy: string;
  temperament: string[];
  location: { zip: string; distanceMi?: number };
  hypoallergenic?: boolean;
  shedLevel?: "low"|"med"|"high";
  groomingLoad?: "low"|"med"|"high";
  barky?: boolean;
  rawDescription?: string;
  // Additional fields from existing
  gender?: string;
  photos?: string[];
  publishedAt?: string;
  city?: string;
  state?: string;
  tags?: string[];
  url?: string;
  shelter?: {
    name: string;
    email: string;
    phone: string;
  };
};

// Per-dog analysis & outputs
export type DogAnalysis = {
  dogId: string;
  score: number;                     // 0..100
  matchedPrefs: string[];            // human-readable chips
  unmetPrefs: string[];
  reasons: {                         // AI copy
    primary150?: string;
    blurb50?: string;
  };
};

// Final output type
export type MatchingResults = {
  topMatches: DogAnalysis[];         // length ≤ 3
  allMatches: DogAnalysis[];
  expansionNotes: string[];          // e.g., "'doodles' → labradoodle, goldendoodle..."
  error?: string;                    // Error message if matching failed
};

// Validation helper
export function validateUserPreferences(data: unknown): UserPreferences {
  return UserPreferencesSchema.parse(data);
}

// Type guards
export function isValidDog(dog: unknown): dog is Dog {
  return typeof dog === 'object' && dog !== null && 
         typeof (dog as Dog).id === 'string' &&
         typeof (dog as Dog).name === 'string' &&
         Array.isArray((dog as Dog).breeds);
}

export function isValidDogAnalysis(analysis: unknown): analysis is DogAnalysis {
  return typeof analysis === 'object' && analysis !== null &&
         typeof (analysis as DogAnalysis).dogId === 'string' &&
         typeof (analysis as DogAnalysis).score === 'number' &&
         Array.isArray((analysis as DogAnalysis).matchedPrefs) &&
         Array.isArray((analysis as DogAnalysis).unmetPrefs);
}

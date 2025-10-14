/**
 * Breed Temperament Tendencies
 * 
 * Maps dog breeds to their general temperament tendencies with strength scores (0-3).
 * These are soft priors that can be overridden by explicit dog profile evidence.
 */

export type TemperamentTrait = 
  | "eager-to-please" | "intelligent" | "focused" | "adaptable" | "independent-thinker"
  | "loyal" | "protective" | "confident" | "gentle" | "sensitive"
  | "playful" | "calm-indoors" | "alert-watchful" | "quiet" | "companion-driven";

export type BreedTemperamentMap = Record<string, Partial<Record<TemperamentTrait, number>>>;

/**
 * Breed temperament tendencies with strength scores (0-3)
 * 0 = not characteristic, 1 = slightly, 2 = moderately, 3 = strongly characteristic
 */
export const BREED_TEMPERAMENT_MAP: BreedTemperamentMap = {
  // High Energy Breeds
  "border collie": {
    "intelligent": 3,
    "focused": 3,
    "eager-to-please": 3,
    "alert-watchful": 3,
    "playful": 2,
    "loyal": 3
  },
  "australian shepherd": {
    "intelligent": 3,
    "focused": 2,
    "eager-to-please": 3,
    "alert-watchful": 3,
    "loyal": 3
  },
  "jack russell terrier": {
    "playful": 3,
    "alert-watchful": 3,
    "independent-thinker": 2,
    "confident": 2
  },
  "beagle": {
    "playful": 2,
    "alert-watchful": 2,
    "independent-thinker": 2
  },
  "husky": {
    "independent-thinker": 3,
    "playful": 2,
    "loyal": 2,
    "alert-watchful": 2
  },
  "siberian husky": {
    "independent-thinker": 3,
    "playful": 2,
    "loyal": 2,
    "alert-watchful": 2
  },

  // Moderate Energy Breeds
  "labrador retriever": {
    "eager-to-please": 3,
    "playful": 3,
    "loyal": 3,
    "adaptable": 2
  },
  "golden retriever": {
    "eager-to-please": 3,
    "gentle": 3,
    "loyal": 3,
    "playful": 2
  },
  "german shepherd": {
    "intelligent": 3,
    "loyal": 3,
    "protective": 3,
    "confident": 3,
    "focused": 2,
    "alert-watchful": 3
  },
  "poodle": {
    "intelligent": 3,
    "eager-to-please": 3,
    "adaptable": 3,
    "alert-watchful": 2,
    "playful": 2
  },
  "boxer": {
    "playful": 3,
    "loyal": 3,
    "confident": 2,
    "alert-watchful": 2
  },

  // Low Energy Breeds
  "bulldog": {
    "calm-indoors": 3,
    "gentle": 3,
    "loyal": 2,
    "quiet": 2
  },
  "basset hound": {
    "calm-indoors": 3,
    "gentle": 3,
    "quiet": 2,
    "independent-thinker": 2
  },
  "great dane": {
    "calm-indoors": 3,
    "gentle": 3,
    "loyal": 2,
    "quiet": 2
  },
  "mastiff": {
    "calm-indoors": 3,
    "gentle": 3,
    "protective": 2,
    "loyal": 2,
    "quiet": 2
  },

  // Small Breeds
  "chihuahua": {
    "loyal": 3,
    "alert-watchful": 3,
    "companion-driven": 3,
    "confident": 2,
    "sensitive": 2
  },
  "yorkshire terrier": {
    "loyal": 3,
    "alert-watchful": 3,
    "companion-driven": 3,
    "confident": 2,
    "playful": 2
  },
  "maltese": {
    "gentle": 3,
    "companion-driven": 3,
    "calm-indoors": 2,
    "quiet": 2
  },
  "shih tzu": {
    "gentle": 3,
    "companion-driven": 3,
    "calm-indoors": 2,
    "quiet": 2
  },
  "bichon frise": {
    "playful": 3,
    "adaptable": 2,
    "gentle": 2
  },

  // Working Breeds
  "rottweiler": {
    "loyal": 3,
    "protective": 3,
    "confident": 3,
    "focused": 2
  },
  "doberman pinscher": {
    "loyal": 3,
    "protective": 3,
    "intelligent": 3,
    "alert-watchful": 3,
    "confident": 3
  },
  "akita": {
    "loyal": 3,
    "protective": 3,
    "independent-thinker": 3,
    "alert-watchful": 3
  },

  // Herding Breeds
  "corgi": {
    "intelligent": 3,
    "eager-to-please": 2,
    "playful": 3,
    "alert-watchful": 2
  },
  "shetland sheepdog": {
    "intelligent": 3,
    "eager-to-please": 3,
    "alert-watchful": 3,
    "loyal": 2
  },

  // Sporting Breeds
  "cocker spaniel": {
    "gentle": 3,
    "eager-to-please": 2,
    "adaptable": 2,
    "playful": 2
  },
  "springer spaniel": {
    "eager-to-please": 2,
    "playful": 3,
    "adaptable": 2
  },

  // Terriers
  "scottish terrier": {
    "independent-thinker": 3,
    "alert-watchful": 3,
    "confident": 3,
    "loyal": 2
  },
  "west highland terrier": {
    "confident": 3,
    "independent-thinker": 2,
    "alert-watchful": 2,
    "playful": 2
  },

  // Hounds
  "greyhound": {
    "calm-indoors": 3,
    "gentle": 3,
    "quiet": 3
  },
  "bloodhound": {
    "focused": 3,
    "gentle": 3,
    "independent-thinker": 2,
    "alert-watchful": 2
  }
};

/**
 * Get temperament tendencies for a breed (case-insensitive)
 */
export function getBreedTemperaments(breed: string): Partial<Record<TemperamentTrait, number>> {
  const normalizedBreed = breed.toLowerCase().trim();
  return BREED_TEMPERAMENT_MAP[normalizedBreed] || {};
}

/**
 * Get temperament tendencies for multiple breeds, combining scores
 */
export function getMultiBreedTemperaments(breeds: string[]): Partial<Record<TemperamentTrait, number>> {
  const combined: Partial<Record<TemperamentTrait, number>> = {};
  
  for (const breed of breeds) {
    const tendencies = getBreedTemperaments(breed);
    for (const [trait, score] of Object.entries(tendencies)) {
      const traitKey = trait as TemperamentTrait;
      if (combined[traitKey] === undefined) {
        combined[traitKey] = score;
      } else {
        // Average the scores for multi-breed dogs
        combined[traitKey] = Math.round(((combined[traitKey] as number) + score) / 2);
      }
    }
  }
  
  return combined;
}

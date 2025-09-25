// AI Service for generating dog recommendations using OpenAI API

export interface Dog {
  id: string;
  name: string;
  breeds: string[];
  age: string;
  size: string;
  gender: string;
  photos: string[];
  publishedAt: string;
  location: {
    city: string;
    state: string;
    distanceMi: number;
  };
  tags: string[];
  url: string;
  shelter: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface UserPreferences {
  age?: string[];
  size?: string[];
  includeBreeds?: string[];
  temperament?: string[];
  energy?: string;
}

export interface AIReasoning {
  primary: string;
  additional: string[];
  concerns: string[];
}

// Generate AI reasoning for Top Picks (150 characters max for primary)
export async function generateTopPickReasoning(
  dog: Dog, 
  userPreferences: UserPreferences
): Promise<AIReasoning> {
  const prompt = createTopPickPrompt(dog, userPreferences);
  
  try {
    console.log('🚀 Calling OpenAI API for Top Pick reasoning...');
    const response = await fetch('/api/ai-reasoning', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, type: 'top-pick' }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🎯 OpenAI response received:', data);
    return data.reasoning;
  } catch (error) {
    console.error('❌ AI reasoning error, using fallback:', error);
    // Fallback to basic reasoning
    return generateFallbackReasoning(dog);
  }
}

// Generate AI reasoning for All Matches (50 characters max)
export async function generateAllMatchReasoning(
  dog: Dog, 
  userPreferences: UserPreferences
): Promise<string> {
  const prompt = createAllMatchPrompt(dog, userPreferences);
  
  try {
    console.log('🚀 Calling OpenAI API for All Match reasoning...');
    const response = await fetch('/api/ai-reasoning', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, type: 'all-match' }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🎯 OpenAI response received:', data);
    return data.reasoning;
  } catch (error) {
    console.error('❌ AI reasoning error, using fallback:', error);
    // Fallback to basic reasoning
    return generateFallbackShortReasoning(dog);
  }
}

// Create detailed prompt for Top Picks
function createTopPickPrompt(dog: Dog, userPreferences: UserPreferences): string {
  const breedInfo = dog.breeds.join(', ');
  const ageInfo = dog.age;
  const sizeInfo = dog.size;
  const temperamentInfo = dog.tags.join(', ');
  const locationInfo = `${dog.location.city}, ${dog.location.state}`;
  
  const userAge = userPreferences.age?.join(', ') || 'any age';
  const userSize = userPreferences.size?.join(', ') || 'any size';
  const userBreeds = userPreferences.includeBreeds?.join(', ') || 'any breed';
  const userTemperament = userPreferences.temperament?.join(', ') || 'any temperament';
  const userEnergy = userPreferences.energy || 'any energy level';

  return `You are an expert dog adoption counselor. Analyze this dog and explain why they would be a great match for this user.

DOG PROFILE:
- Name: ${dog.name}
- Breeds: ${breedInfo}
- Age: ${ageInfo}
- Size: ${sizeInfo}
- Temperament: ${temperamentInfo}
- Location: ${locationInfo}

USER PREFERENCES:
- Preferred ages: ${userAge}
- Preferred sizes: ${userSize}
- Preferred breeds: ${userBreeds}
- Preferred temperament: ${userTemperament}
- Preferred energy level: ${userEnergy}

Generate a personalized recommendation with:
1. PRIMARY REASON (max 150 characters): Why this dog is perfect for this user
2. ADDITIONAL REASONS (max 2, each under 50 characters): Supporting points
3. CONCERNS (if any): Potential challenges to consider

Focus on specific breed characteristics, age benefits, size advantages, and temperament matches. Be warm, encouraging, and specific about why this particular dog fits this user's lifestyle.

Respond in JSON format:
{
  "primary": "Your primary reason here (max 150 chars)",
  "additional": ["Additional reason 1 (max 50 chars)", "Additional reason 2 (max 50 chars)"],
  "concerns": ["Any concerns (max 50 chars each)"]
}`;
}

// Create concise prompt for All Matches
function createAllMatchPrompt(dog: Dog, userPreferences: UserPreferences): string {
  const breedInfo = dog.breeds.join(', ');
  const ageInfo = dog.age;
  const sizeInfo = dog.size;
  const temperamentInfo = dog.tags.join(', ');
  
  const userAge = userPreferences.age?.join(', ') || 'any age';
  const userSize = userPreferences.size?.join(', ') || 'any size';
  const userBreeds = userPreferences.includeBreeds?.join(', ') || 'any breed';

  return `You are an expert dog adoption counselor. Create a very brief, compelling reason why this dog would be a good match.

DOG: ${dog.name} - ${breedInfo} - ${ageInfo} - ${sizeInfo} - ${temperamentInfo}
USER WANTS: ${userAge} - ${userSize} - ${userBreeds}

Generate ONE short reason (max 50 characters) why this dog matches the user's preferences. Focus on the most compelling trait.

Examples:
- "Gentle family dog"
- "Smart & energetic" 
- "Hypoallergenic & calm"
- "Young & trainable"

Respond with just the reason text, no quotes or formatting.`;
}

// Fallback reasoning when AI fails
function generateFallbackReasoning(dog: Dog): AIReasoning {
  const breed = dog.breeds[0]?.toLowerCase() || 'mixed';
  const age = dog.age.toLowerCase();
  const size = dog.size.toLowerCase();
  
  let primary = "Great potential as a loving companion";
  
  if (breed.includes('golden') || breed.includes('labrador')) {
    primary = "Gentle & patient - perfect for families";
  } else if (breed.includes('border collie') || breed.includes('australian shepherd')) {
    primary = "Smart & energetic - perfect for active owners";
  } else if (breed.includes('poodle')) {
    primary = "Hypoallergenic & intelligent companion";
  }
  
  const additional = [];
  if (age.includes('puppy') || age.includes('baby')) {
    additional.push("Young & trainable");
  } else if (age.includes('adult')) {
    additional.push("Pre-trained adult");
  }
  
  if (size.includes('small')) {
    additional.push("Apartment friendly");
  } else if (size.includes('large')) {
    additional.push("Active companion");
  }
  
  return {
    primary,
    additional: additional.slice(0, 2),
    concerns: []
  };
}

// Fallback short reasoning when AI fails
function generateFallbackShortReasoning(dog: Dog): string {
  const breed = dog.breeds[0]?.toLowerCase() || 'mixed';
  const age = dog.age.toLowerCase();
  
  if (breed.includes('golden') || breed.includes('labrador')) {
    return "Gentle family dog";
  } else if (breed.includes('border collie') || breed.includes('australian shepherd')) {
    return "Smart & energetic";
  } else if (breed.includes('poodle')) {
    return "Hypoallergenic & smart";
  } else if (age.includes('puppy') || age.includes('baby')) {
    return "Young & trainable";
  } else if (age.includes('adult')) {
    return "Pre-trained adult";
  } else {
    return "Great companion";
  }
}

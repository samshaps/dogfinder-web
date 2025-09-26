// API utility functions for communicating with the FastAPI backend

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

// Type definitions for our data (matching the FastAPI response)
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

export interface DogsResponse {
  items: Dog[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SearchParams {
  zip?: string;
  radius?: number;
  age?: string | string[];
  includeBreeds?: string | string[];
  excludeBreeds?: string | string[];
  size?: string | string[];
  temperament?: string | string[];
  energy?: string;
  guidance?: string;  // Add guidance parameter
  sort?: 'freshness' | 'distance' | 'age' | 'size';
  page?: number;
  limit?: number;
}

// Narrowed type for raw API payload (Petfinder → backend passthrough)
type RawDog = {
  id: string;
  name?: string;
  breeds?: { primary?: string; secondary?: string };
  age?: string;
  size?: string;
  gender?: string;
  photos?: Array<{ large?: string; medium?: string; small?: string }>;
  published_at?: string;
  contact?: {
    address?: { city?: string; state?: string };
    email?: string;
    phone?: string;
  };
  distance?: number;
  url?: string;
  organization?: { name?: string };
  tags?: string[];
  attributes?: Record<string, unknown>;
};

// Convert search parameters to URL query string
function buildQueryString(params: SearchParams): string {
  const searchParams = new URLSearchParams();
  
  if (params.zip) searchParams.set('zip', params.zip);
  if (params.radius) searchParams.set('radius', params.radius.toString());
  if (params.age) {
    const ageValue = Array.isArray(params.age) ? params.age.join(',') : params.age;
    searchParams.set('age', ageValue);
  }
  if (params.includeBreeds) {
    const breedsValue = Array.isArray(params.includeBreeds) ? params.includeBreeds.join(',') : params.includeBreeds;
    searchParams.set('includeBreeds', breedsValue);
  }
  if (params.excludeBreeds) {
    const breedsValue = Array.isArray(params.excludeBreeds) ? params.excludeBreeds.join(',') : params.excludeBreeds;
    searchParams.set('excludeBreeds', breedsValue);
  }
  if (params.size) {
    const sizeValue = Array.isArray(params.size) ? params.size.join(',') : params.size;
    searchParams.set('size', sizeValue);
  }
  if (params.temperament) {
    const temperamentValue = Array.isArray(params.temperament) ? params.temperament.join(',') : params.temperament;
    searchParams.set('temperament', temperamentValue);
  }
  if (params.energy) searchParams.set('energy', params.energy);
  if (params.guidance) searchParams.set('guidance', params.guidance);  // Add guidance parameter handling
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// Transform raw Petfinder data to our Dog interface
function transformDogData(raw: RawDog): Dog {
  const breeds: string[] = [];
  if (raw.breeds?.primary) breeds.push(raw.breeds.primary);
  if (raw.breeds?.secondary) breeds.push(raw.breeds.secondary);
  
  const photos: string[] = [];
  if (raw.photos && raw.photos.length > 0) {
    raw.photos.forEach((photo) => {
      if (photo.large) photos.push(photo.large);
      else if (photo.medium) photos.push(photo.medium);
      else if (photo.small) photos.push(photo.small);
    });
  }
  
  const tags: string[] = [];
  if (raw.tags) tags.push(...raw.tags);
  if (raw.attributes) {
    Object.entries(raw.attributes).forEach(([key, value]) => {
      if (value === true) tags.push(key.replace(/_/g, ' '));
    });
  }
  
  return {
    id: raw.id,
    name: raw.name || 'Unknown',
    breeds: breeds.length > 0 ? breeds : ['Mixed Breed'],
    age: raw.age || 'Unknown',
    size: raw.size || 'Unknown',
    gender: raw.gender || 'Unknown',
    photos: photos,
    publishedAt: raw.published_at || new Date().toISOString(),
    location: {
      city: raw.contact?.address?.city || 'Unknown',
      state: raw.contact?.address?.state || 'Unknown',
      distanceMi: raw.distance || 0
    },
    tags: tags,
    url: raw.url || '#',
    shelter: {
      name: raw.organization?.name || 'Unknown Shelter',
      email: raw.contact?.email || '',
      phone: raw.contact?.phone || ''
    }
  };
}

// Fetch dogs with search parameters
export async function searchDogs(params: SearchParams = {}): Promise<DogsResponse> {
  const queryString = buildQueryString(params);
  const response = await fetch(`${API_BASE}/api/dogs${queryString}`, {
    cache: 'no-store', // Always fetch fresh data
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  const rawData = await response.json();
  
  // Transform the raw data to our expected format
  return {
    items: rawData.items.map(transformDogData),
    page: rawData.page,
    pageSize: rawData.pageSize,
    total: rawData.total
  };
}

// Alias for searchDogs to match the results page import
export const listDogs = searchDogs;

// Fetch a single dog by ID
export async function getDogById(id: string): Promise<Dog> {
  const response = await fetch(`${API_BASE}/api/dogs/${id}`, {
    cache: 'no-store',
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Dog not found');
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Helper function to get the best photo URL for a dog
export function getDogPhotoUrl(dog: Dog): string | null {
  if (!dog.photos || dog.photos.length === 0) {
    return null;
  }
  
  return dog.photos[0] || null;
}

// Helper function to format dog breeds
export function formatDogBreeds(dog: Dog): string {
  if (!dog.breeds || dog.breeds.length === 0) return 'Unknown';
  return dog.breeds.join(', ');
}

// Helper function to format location
export function formatDogLocation(dog: Dog): string {
  if (!dog.location) return 'Location unknown';
  
  const { city, state } = dog.location;
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  
  return 'Location unknown';
}

// Helper function to format published date
export function formatPublishedDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString();
}

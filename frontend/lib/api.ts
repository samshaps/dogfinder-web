// API utility functions for communicating with the FastAPI backend

// Prefer env base; in dev default to FastAPI backend directly
const DEV_DEFAULT_BASE = 'http://127.0.0.1:8000';
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || (process.env.NODE_ENV !== 'production' ? DEV_DEFAULT_BASE : '');

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
  
  const sanitizeToken = (t: string) => String(t).split('?')[0].trim();
  const setCSV = (key: string, value?: string | string[]) => {
    if (value === undefined || value === null) return;
    const parts = Array.isArray(value) ? value : String(value).split(',');
    const cleaned = parts
      .map(v => sanitizeToken(v))
      .filter(Boolean);
    const str = cleaned.join(',');
    if (str.length > 0) searchParams.set(key, str);
  };

  if (params.zip) searchParams.set('zip', params.zip);
  if (params.radius) searchParams.set('radius', params.radius.toString());
  setCSV('age', params.age);
  setCSV('includeBreeds', params.includeBreeds);
  setCSV('excludeBreeds', params.excludeBreeds);
  setCSV('size', params.size);
  setCSV('temperament', params.temperament);
  if (params.energy && sanitizeToken(params.energy).length > 0) searchParams.set('energy', sanitizeToken(params.energy));
  if (params.guidance && params.guidance.trim().length > 0) searchParams.set('guidance', params.guidance);
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
  // Expand structured prefs with guidance before hitting the backend so the backend fetch includes expanded filters
  try {
    // Guidance processing is now handled by the new matching system
    // const { mergeGuidanceIntoPrefs } = await import('@/utils/matching');
    // If guidance text exists, normalize it via the LLM endpoint first
    if (params.guidance && params.guidance.trim().length > 0) {
      try {
        const normResp = await fetch('/api/normalize-guidance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guidance: params.guidance })
        });
        if (normResp.ok) {
          const norm = await normResp.json();
          // Merge normalized preferences into the params (do not overwrite explicit selections)
          const normAge = Array.isArray(norm.age) ? norm.age : undefined;
          const normSize = Array.isArray(norm.size) ? norm.size : undefined;
          const normTemps = Array.isArray(norm.temperament) ? norm.temperament : undefined;
          const normEnergy = typeof norm.energy === 'string' ? norm.energy : undefined;
          params = {
            ...params,
            age: params.age || normAge,
            size: params.size || normSize,
            temperament: params.temperament || normTemps,
            energy: params.energy || (normEnergy as any)
          };
        }
      } catch {}
    }
    // Create effective preferences for the API call
    const effectiveParams = {
      age: Array.isArray(params.age) ? params.age as string[] : (params.age ? String(params.age).split(',') : undefined),
      size: Array.isArray(params.size) ? params.size as string[] : (params.size ? String(params.size).split(',') : undefined),
      includeBreeds: Array.isArray(params.includeBreeds) ? params.includeBreeds as string[] : (params.includeBreeds ? String(params.includeBreeds).split(',') : undefined),
      excludeBreeds: Array.isArray(params.excludeBreeds) ? params.excludeBreeds as string[] : (params.excludeBreeds ? String(params.excludeBreeds).split(',') : undefined),
      temperament: Array.isArray(params.temperament) ? params.temperament as string[] : (params.temperament ? String(params.temperament).split(',') : undefined),
      energy: params.energy as any,
      guidance: params.guidance,
    };
    params = { ...params, ...effectiveParams };
    // Debug log (prints in Next dev terminal for SSR, and in browser on CSR)
    // eslint-disable-next-line no-console
    console.log('🔎 Expanded search params:', { age: params.age, size: params.size, energy: params.energy, temperament: params.temperament, guidance: params.guidance });
  } catch {
    // No-op if dynamic import fails in some environments
  }
  // Support multiple zip codes by batching calls and merging
  const zips: string[] = (params.zip || '')
    .split(',')
    .map(z => z.trim())
    .filter(Boolean);

  const fetchForZip = async (zip: string): Promise<DogsResponse> => {
    const qs = buildQueryString({ ...params, zip });
    const primaryUrl = `${API_BASE}/api/dogs${qs}`;
    const fallbackUrl = `/api/dogs${qs}`;
    // eslint-disable-next-line no-console
    console.log('🔎 Fetching:', primaryUrl);
    let resp: Response | null = null;
    try {
      resp = await fetch(primaryUrl, { cache: 'no-store' });
      if (!resp.ok && API_BASE) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ Primary API_BASE fetch failed, retrying without base:', resp.status, resp.statusText);
        resp = await fetch(fallbackUrl, { cache: 'no-store' });
      }
    } catch (e) {
      if (API_BASE) {
        // Network error to API_BASE, retry without base
        // eslint-disable-next-line no-console
        console.warn('⚠️ Primary API_BASE fetch errored, retrying without base:', (e as Error)?.message);
        resp = await fetch(fallbackUrl, { cache: 'no-store' });
      } else {
        throw e;
      }
    }
    if (!resp || !resp.ok) throw new Error(`API error: ${resp?.status} ${resp?.statusText}`);
    const data = await resp.json();
    return {
      items: data.items.map(transformDogData),
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
    } as DogsResponse;
  };

  let merged: Dog[] = [];
  if (zips.length > 1) {
    const results = await Promise.allSettled(zips.map(zip => fetchForZip(zip)));
    const seen = new Set<string>();
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        r.value.items.forEach(d => {
          // Deduplicate by id; fallback to url if id missing
          const key = d.id || d.url;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(d);
          }
        });
      }
    });
    return {
      items: merged,
      page: 1,
      pageSize: merged.length,
      total: merged.length,
    };
  } else {
    const single = await fetchForZip(zips[0] || (params.zip || ''));
    return single;
  }
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

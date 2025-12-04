import { sanitizeDescription } from './utils/description-sanitizer';
import { normalizeDogGender } from './utils/pronouns';
import type { Dog } from './api';

/**
 * Provider identifiers – keep Petfinder around but inactive by default so
 * we can re‑enable it later if their public API access changes.
 */
export type DogProviderId = 'rescuegroups' | 'petfinder';

export interface SearchDogsParams {
  zip?: string;
  radius?: number;
  age?: string | string[];
  size?: string | string[];
  includeBreeds?: string | string[];
  excludeBreeds?: string | string[];
  sort?: 'freshness' | 'distance' | 'age' | 'size';
  page?: number;
  limit?: number;
}

export interface DogsPage {
  items: Dog[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DogProvider {
  id: DogProviderId;
  searchDogs(params: SearchDogsParams): Promise<DogsPage>;
  getDogById(id: string): Promise<Dog | null>;
}

/**
 * ---------- RescueGroups.org implementation (active provider) ----------
 *
 * NOTE: RescueGroups v5 API uses POST with a JSON body and API key auth.
 * We keep this self‑contained here and normalize the result into our Dog type.
 */

type RescueGroupsAnimal = {
  id: number | string;
  attributes: {
    name?: string;
    ageGroup?: string;
    sizeGroup?: string;
    sex?: string;
    descriptionText?: string;
    publishedDate?: string;
    distance?: number;
    adoptionUrl?: string;
  };
  relationships?: {
    breedPrimary?: { data?: { attributes?: { name?: string } } };
    breedSecondary?: { data?: { attributes?: { name?: string } } };
    organization?: { data?: { attributes?: { name?: string } } };
    pictures?: { data?: Array<{ attributes?: { large?: string; medium?: string; small?: string } }> };
    location?: { data?: { attributes?: { city?: string; state?: string } } };
  };
};

interface RescueGroupsSearchResponse {
  data?: RescueGroupsAnimal[];
  meta?: { pagination?: { total?: number; count?: number; current_page?: number } };
}

function getRescueGroupsConfig() {
  const apiKey = process.env.RESCUEGROUPS_API_KEY;
  const baseUrl = process.env.RESCUEGROUPS_BASE_URL || 'https://api.rescuegroups.org/v5';

  if (!apiKey) {
    throw new Error('RESCUEGROUPS_API_KEY is not configured');
  }

  return { apiKey, baseUrl };
}

function mapRescueGroupsAnimalToDog(animal: RescueGroupsAnimal): Dog {
  const attrs = animal.attributes || {};
  const rel = animal.relationships || {};

  const breeds: string[] = [];
  const primaryBreed = rel.breedPrimary?.data?.attributes?.name;
  const secondaryBreed = rel.breedSecondary?.data?.attributes?.name;
  if (primaryBreed) breeds.push(primaryBreed);
  if (secondaryBreed) breeds.push(secondaryBreed);

  const photos: string[] = [];
  if (Array.isArray(rel.pictures?.data)) {
    rel.pictures!.data.forEach((p) => {
      if (p.attributes?.large) photos.push(p.attributes.large);
      else if (p.attributes?.medium) photos.push(p.attributes.medium);
      else if (p.attributes?.small) photos.push(p.attributes.small);
    });
  }

  const city = rel.location?.data?.attributes?.city || 'Unknown';
  const state = rel.location?.data?.attributes?.state || 'Unknown';

  const sanitizedDescription = sanitizeDescription(attrs.descriptionText);

  const normalizedGender = normalizeDogGender(attrs.sex);
  const genderLabel =
    normalizedGender === 'male' ? 'Male' : normalizedGender === 'female' ? 'Female' : 'Unknown';

  return {
    id: String(animal.id),
    name: attrs.name || 'Unknown',
    breeds: breeds.length > 0 ? breeds : ['Mixed Breed'],
    age: (attrs.ageGroup || 'Unknown').toLowerCase(),
    size: (attrs.sizeGroup || 'Unknown').toLowerCase(),
    gender: genderLabel,
    photos,
    publishedAt: attrs.publishedDate || new Date().toISOString(),
    location: {
      city,
      state,
      distanceMi: attrs.distance || 0,
    },
    tags: [],
    url: attrs.adoptionUrl || '#',
    shelter: {
      name: rel.organization?.data?.attributes?.name || 'Unknown Shelter',
      email: '',
      phone: '',
    },
    description: sanitizedDescription || undefined,
  };
}

export class RescueGroupsDogProvider implements DogProvider {
  id: DogProviderId = 'rescuegroups';

  async searchDogs(params: SearchDogsParams): Promise<DogsPage> {
    const { apiKey, baseUrl } = getRescueGroupsConfig();

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = Math.min(params.limit || 20, 50);

    const filters: any[] = [];
    if (params.zip) {
      filters.push({
        fieldName: 'animals.locationPostalcode',
        operation: 'equals',
        criteria: params.zip,
      });
    }
    if (params.radius) {
      filters.push({
        fieldName: 'animals.locationDistance',
        operation: 'lessthanorequal',
        criteria: params.radius,
      });
    }
    if (params.age) {
      const ages = Array.isArray(params.age) ? params.age : String(params.age).split(',');
      filters.push({
        fieldName: 'animals.ageGroup',
        operation: 'in',
        criteria: ages,
      });
    }
    if (params.size) {
      const sizes = Array.isArray(params.size) ? params.size : String(params.size).split(',');
      filters.push({
        fieldName: 'animals.sizeGroup',
        operation: 'in',
        criteria: sizes,
      });
    }

    const body = {
      data: {
        filters,
        page: { limit, current: page },
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch(`${baseUrl}/public/animals/search/available/dogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(
        `RescueGroups API error: ${resp.status} ${resp.statusText} ${txt.substring(0, 160)}`,
      );
    }

    const json = (await resp.json()) as RescueGroupsSearchResponse;
    const animals = Array.isArray(json.data) ? json.data : [];
    const mapped = animals.map(mapRescueGroupsAnimalToDog);
    const total = json.meta?.pagination?.total ?? mapped.length;
    const count = json.meta?.pagination?.count ?? mapped.length;
    const currentPage = json.meta?.pagination?.current_page ?? page;

    return {
      items: mapped,
      page: currentPage,
      pageSize: count,
      total,
    };
  }

  async getDogById(id: string): Promise<Dog | null> {
    const { apiKey, baseUrl } = getRescueGroupsConfig();

    const body = {
      data: {
        filters: [
          {
            fieldName: 'animals.id',
            operation: 'equals',
            criteria: id,
          },
        ],
        page: { limit: 1, current: 1 },
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch(`${baseUrl}/public/animals/search/available/dogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(
        `RescueGroups API error (getDogById): ${resp.status} ${resp.statusText} ${txt.substring(
          0,
          160,
        )}`,
      );
    }

    const json = (await resp.json()) as RescueGroupsSearchResponse;
    const animal = Array.isArray(json.data) && json.data.length > 0 ? json.data[0] : null;
    if (!animal) return null;
    return mapRescueGroupsAnimalToDog(animal);
  }
}

/**
 * Simple provider factory – today we only support RescueGroups as the active
 * provider, but we keep the Petfinder identifier around for future use.
 */
export function getActiveDogProvider(): DogProvider {
  const configured = (process.env.DOG_PROVIDER || 'rescuegroups') as DogProviderId;

  switch (configured) {
    case 'rescuegroups':
    default:
      return new RescueGroupsDogProvider();
  }
}



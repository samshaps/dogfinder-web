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

type RescueGroupsRef = { id: number | string } | null | undefined;

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
    organizationId?: number | string; // Check if org ID is in attributes
    orgId?: number | string; // Alternative field name
  };
  relationships?: {
    breedPrimary?: { data?: RescueGroupsRef };
    breedSecondary?: { data?: RescueGroupsRef };
    organization?: { data?: RescueGroupsRef };
    org?: { data?: RescueGroupsRef }; // Alternative relationship name
    orgs?: { data?: RescueGroupsRef[] }; // Plural form (actual relationship name)
    pictures?: { data?: RescueGroupsRef[] };
    location?: { data?: RescueGroupsRef };
  };
};

type RescueGroupsIncluded = {
  type: string;
  id: number | string;
  attributes: any;
};

interface RescueGroupsSearchResponse {
  data?: RescueGroupsAnimal[];
  included?: RescueGroupsIncluded[];
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

function mapRescueGroupsAnimalToDog(
  animal: RescueGroupsAnimal,
  indexes?: {
    picturesById?: Map<string, any>;
    locationsById?: Map<string, any>;
    orgsById?: Map<string, any>;
  }
): Dog {
  const attrs = animal.attributes || {};
  const rel = animal.relationships || {};

  const breeds: string[] = [];
  const primaryBreedId = rel.breedPrimary?.data?.id;
  const secondaryBreedId = rel.breedSecondary?.data?.id;
  if (primaryBreedId) breeds.push(String(primaryBreedId));
  if (secondaryBreedId) breeds.push(String(secondaryBreedId));

  const photos: string[] = [];
  if (Array.isArray(rel.pictures?.data) && indexes?.picturesById) {
    rel.pictures.data.forEach((ref) => {
      if (!ref?.id) return;
      const pic = indexes.picturesById!.get(String(ref.id));
      if (!pic) {
        console.warn(`[RescueGroups] Picture ${ref.id} not found in included array`);
        return;
      }
      // RescueGroups schema: pictures have large, original, small as objects with url property
      // Strip query params (like ?width=500) to avoid conflicts with Vercel image optimization
      const stripQueryParams = (url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.origin + parsed.pathname;
        } catch {
          return url.split('?')[0];
        }
      };
      const getUrl = (sizeObj: any) => {
        if (!sizeObj) return null;
        const url = typeof sizeObj === 'string' ? sizeObj : sizeObj.url;
        return url ? stripQueryParams(url) : null;
      };
      const largeUrl = getUrl(pic.large);
      const originalUrl = getUrl(pic.original);
      const smallUrl = getUrl(pic.small);
      if (largeUrl) photos.push(largeUrl);
      else if (originalUrl) photos.push(originalUrl);
      else if (smallUrl) photos.push(smallUrl);
      else {
        console.warn(`[RescueGroups] Picture ${ref.id} has no valid URL:`, pic);
      }
    });
  } else if (Array.isArray(rel.pictures?.data) && rel.pictures.data.length > 0) {
    console.warn(
      `[RescueGroups] Animal ${animal.id} has picture relationships but no picturesById index`,
    );
  }

  let city = 'Unknown';
  let state = 'Unknown';
  if (rel.location?.data?.id && indexes?.locationsById) {
    const loc = indexes.locationsById.get(String(rel.location.data.id));
    if (loc) {
      city = loc.city || city;
      state = loc.state || state;
    }
  }

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
    url: (() => {
      // Try animal's direct adoption URL first
      console.log(`[RescueGroups] Animal ${animal.id} attrs.adoptionUrl:`, attrs.adoptionUrl);
      if (attrs.adoptionUrl) {
        console.log(`[RescueGroups] Using animal adoptionUrl for ${animal.id}:`, attrs.adoptionUrl);
        return attrs.adoptionUrl;
      }
      
      // Try to find organization relationship - check multiple possible field names
      // The actual relationship name is "orgs" (plural) and it's an array
      let orgId: string | undefined;
      
      if (rel.orgs?.data && Array.isArray(rel.orgs.data) && rel.orgs.data.length > 0) {
        // orgs.data is an array, take the first one
        orgId = String(rel.orgs.data[0].id);
      } else if (rel.organization?.data?.id) {
        orgId = String(rel.organization.data.id);
      } else if (rel.org?.data?.id) {
        orgId = String(rel.org.data.id);
      } else if (attrs.organizationId) {
        orgId = String(attrs.organizationId);
      } else if (attrs.orgId) {
        orgId = String(attrs.orgId);
      }
      
      if (orgId && indexes?.orgsById) {
        const org = indexes.orgsById.get(orgId);
        if (org?.adoptionUrl) {
          console.log(`[RescueGroups] Using org adoptionUrl for animal ${animal.id} (org ${orgId}):`, org.adoptionUrl);
          return org.adoptionUrl;
        }
        console.log(`[RescueGroups] Org ${orgId} has no adoptionUrl, org data:`, org);
      } else {
        console.error(`[RescueGroups] ERROR: No org ID found for animal ${animal.id}. Available relationships:`, Object.keys(rel || {}));
      }
      
      // No valid URL found - return empty string (will need to be handled by frontend)
      console.error(`[RescueGroups] ERROR: No adoption URL found for animal ${animal.id}`);
      return '';
    })(),
    shelter: (() => {
      let name = 'Unknown Shelter';
      // Use orgs relationship (plural, array)
      let orgId: string | undefined;
      if (rel.orgs?.data && Array.isArray(rel.orgs.data) && rel.orgs.data.length > 0) {
        orgId = String(rel.orgs.data[0].id);
      } else if (rel.organization?.data?.id) {
        orgId = String(rel.organization.data.id);
      } else if (rel.org?.data?.id) {
        orgId = String(rel.org.data.id);
      }
      
      if (orgId && indexes?.orgsById) {
        const org = indexes.orgsById.get(orgId);
        if (org) {
          name = org.name || name;
        }
      }
      return {
        name,
        email: '',
        phone: '',
      };
    })(),
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
    if (params.age) {
      const ages = Array.isArray(params.age)
        ? params.age.filter((a) => !!a)
        : String(params.age)
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean);
      if (ages.length > 0) {
        filters.push({
          fieldName: 'animals.ageGroup',
          operation: 'in',
          criteria: ages,
        });
      }
    }
    if (params.size) {
      const sizes = Array.isArray(params.size)
        ? params.size.filter((s) => !!s)
        : String(params.size)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      if (sizes.length > 0) {
        filters.push({
          fieldName: 'animals.sizeGroup',
          operation: 'in',
          criteria: sizes,
        });
      }
    }

    const body: any = {
      data: {
        page: { limit, current: page },
      },
    };

    if (filters.length > 0) {
      body.data.filters = filters;
    }

    // Use dedicated radius search helper when we have a ZIP code.
    if (params.zip) {
      body.data.filterRadius = {
        miles: params.radius || 50,
        postalcode: params.zip,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const url = new URL(`${baseUrl}/public/animals/search/available/dogs`);
    url.searchParams.set('include', 'pictures,locations,orgs');
    // Request adoptionUrl along with all essential fields (don't limit to just adoptionUrl)
    url.searchParams.set('fields[animals]', 'name,ageGroup,sizeGroup,sex,descriptionText,publishedDate,distance,adoptionUrl');
    url.searchParams.set('fields[orgs]', 'name,adoptionUrl');

    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
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

    const picturesById = new Map<string, any>();
    const locationsById = new Map<string, any>();
    const orgsById = new Map<string, any>();
    if (Array.isArray(json.included)) {
      for (const inc of json.included) {
        const id = String(inc.id);
        if (inc.type === 'pictures') picturesById.set(id, inc.attributes);
        else if (inc.type === 'locations') locationsById.set(id, inc.attributes);
        else if (inc.type === 'orgs') orgsById.set(id, inc.attributes);
      }
    }

    // Debug logging to diagnose photo mapping issues
    const sampleAnimal = animals[0];
    console.log('[RescueGroups] Response summary:', {
      animalsCount: animals.length,
      includedCount: Array.isArray(json.included) ? json.included.length : 0,
      picturesIncluded: Array.isArray(json.included)
        ? json.included.filter((i) => i.type === 'pictures').length
        : 0,
      orgsIncluded: Array.isArray(json.included)
        ? json.included.filter((i) => i.type === 'orgs').length
        : 0,
      picturesByIdSize: picturesById.size,
      orgsByIdSize: orgsById.size,
      sampleAnimal: sampleAnimal
        ? {
            id: sampleAnimal.id,
            hasPicturesRel: !!sampleAnimal.relationships?.pictures?.data,
            picturesRelCount: Array.isArray(sampleAnimal.relationships?.pictures?.data)
              ? sampleAnimal.relationships.pictures.data.length
              : 0,
            hasOrgRel: !!sampleAnimal.relationships?.organization?.data,
            orgRelId: sampleAnimal.relationships?.organization?.data?.id,
            allRelationships: Object.keys(sampleAnimal.relationships || {}),
            relationshipsFull: sampleAnimal.relationships,
          }
        : null,
    });

    const mapped = animals.map((animal) =>
      mapRescueGroupsAnimalToDog(animal, { picturesById, locationsById, orgsById })
    );
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

    const url = new URL(`${baseUrl}/public/animals/search/available/dogs`);
    url.searchParams.set('include', 'pictures,locations,orgs');
    // Request adoptionUrl along with all essential fields (don't limit to just adoptionUrl)
    url.searchParams.set('fields[animals]', 'name,ageGroup,sizeGroup,sex,descriptionText,publishedDate,distance,adoptionUrl');
    url.searchParams.set('fields[orgs]', 'name,adoptionUrl');

    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
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

    const picturesById = new Map<string, any>();
    const locationsById = new Map<string, any>();
    const orgsById = new Map<string, any>();
    if (Array.isArray(json.included)) {
      for (const inc of json.included) {
        const id = String(inc.id);
        if (inc.type === 'pictures') picturesById.set(id, inc.attributes);
        else if (inc.type === 'locations') locationsById.set(id, inc.attributes);
        else if (inc.type === 'orgs') orgsById.set(id, inc.attributes);
      }
    }

    return mapRescueGroupsAnimalToDog(animal, { picturesById, locationsById, orgsById });
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



import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getActiveDogProvider } from '@/lib/dogProviders';
import type { Dog } from '@/lib/api';
import { dogMatchesBreed, type BreedEntry } from './breeds';
import type { CityEntry } from './cities';
import {
  ADOPT_PAGE_DOG_LIMIT,
  ADOPT_PAGE_RADIUS_MILES,
  ADOPT_PAGE_REVALIDATE_SECONDS,
} from './site';

/**
 * Listings loader for programmatic SEO pages.
 *
 * Results are cached for ADOPT_PAGE_REVALIDATE_SECONDS so that thousands of
 * breed x city pages share a bounded number of upstream requests. Errors are
 * not cached: a failed upstream call surfaces as `ok: false` and the next
 * request retries.
 */

export interface AdoptListings {
  ok: boolean;
  dogs: Dog[];
  total: number;
}

interface LoaderArgs {
  breedKeyword?: string;
  breedSlug?: string;
  zip?: string;
  radius?: number;
}

async function loadListingsUncached(args: LoaderArgs): Promise<{ dogs: Dog[]; total: number }> {
  const provider = getActiveDogProvider();
  const page = await provider.searchDogs({
    zip: args.zip,
    radius: args.zip ? args.radius ?? ADOPT_PAGE_RADIUS_MILES : undefined,
    breedKeyword: args.breedKeyword,
    sort: 'freshness',
    page: 1,
    limit: ADOPT_PAGE_DOG_LIMIT,
    allowCaching: true,
  });
  return { dogs: page.items, total: page.total };
}

const loadListingsCached = unstable_cache(
  async (args: LoaderArgs) => loadListingsUncached(args),
  ['adopt-listings-v1'],
  { revalidate: ADOPT_PAGE_REVALIDATE_SECONDS, tags: ['adopt-listings'] },
);

/**
 * Per-request memoized loader so generateMetadata and the page body share one call.
 */
export const getAdoptListings = cache(
  async (breed?: BreedEntry, city?: CityEntry): Promise<AdoptListings> => {
    const args: LoaderArgs = {
      breedKeyword: breed?.keyword,
      breedSlug: breed?.slug,
      zip: city?.zip,
      radius: city ? ADOPT_PAGE_RADIUS_MILES : undefined,
    };
    try {
      const { dogs, total } = await loadListingsCached(args);
      // Guard against provider filter drift: only show dogs whose labels really match.
      const filtered = breed ? dogs.filter((d) => dogMatchesBreed(d.breeds, breed)) : dogs;
      return { ok: true, dogs: filtered, total: filtered.length === 0 ? 0 : Math.max(total, filtered.length) };
    } catch (error) {
      console.error('[adopt] listings unavailable', {
        breed: breed?.slug,
        city: city?.slug,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, dogs: [], total: 0 };
    }
  },
);

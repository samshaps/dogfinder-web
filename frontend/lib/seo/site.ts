/**
 * Site-wide constants for SEO pages, sitemap, robots and structured data.
 */

const PRODUCTION_URL = 'https://dogyenta.com';

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (configured && /^https?:\/\//.test(configured) && !configured.includes('localhost')) {
    return configured.replace(/\/+$/, '');
  }
  return PRODUCTION_URL;
}

export const SITE_NAME = 'DogYenta';

/** How often adopt pages are regenerated (seconds). Listings change hourly, not per minute. */
export const ADOPT_PAGE_REVALIDATE_SECONDS = 60 * 60;

/** How many dogs to show per adopt page. */
export const ADOPT_PAGE_DOG_LIMIT = 24;

/** Default search radius for city pages (miles). */
export const ADOPT_PAGE_RADIUS_MILES = 50;

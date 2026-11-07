import type { MetadataRoute } from 'next';
import { BREEDS, getPopularBreeds } from '@/lib/seo/breeds';
import { CITIES, getMajorCities } from '@/lib/seo/cities';
import { getSiteUrl } from '@/lib/seo/site';

export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/find`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${site}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${site}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${site}/adopt`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${site}/adopt/near`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  const breedPages: MetadataRoute.Sitemap = BREEDS.map((b) => ({
    url: `${site}/adopt/${b.slug}`,
    lastModified: now,
    changeFrequency: 'hourly',
    priority: 0.8,
  }));

  const cityPages: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${site}/adopt/near/${c.slug}`,
    lastModified: now,
    changeFrequency: 'hourly',
    priority: 0.7,
  }));

  const breedCityPages: MetadataRoute.Sitemap = [];
  for (const b of getPopularBreeds()) {
    for (const c of getMajorCities()) {
      breedCityPages.push({
        url: `${site}/adopt/${b.slug}/${c.slug}`,
        lastModified: now,
        changeFrequency: 'hourly',
        priority: 0.6,
      });
    }
  }

  return [...core, ...breedPages, ...cityPages, ...breedCityPages];
}

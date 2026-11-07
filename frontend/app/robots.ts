import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/profile',
          '/results',
          '/unsubscribe',
          '/rate-limit',
          '/test-api',
          '/test-page',
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}

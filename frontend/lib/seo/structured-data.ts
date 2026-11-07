import type { Dog } from '@/lib/api';
import { getSiteUrl, SITE_NAME } from './site';

/**
 * JSON-LD builders for programmatic SEO pages. Kept to schema.org types Google
 * documents for breadcrumbs, item lists and FAQs.
 */

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${site}${c.path}`,
    })),
  };
}

export function collectionPageJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  dogs: Dog[];
}) {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: `${site}${opts.path}`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: site },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: opts.dogs.length,
      itemListElement: opts.dogs.slice(0, 24).map((dog, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Thing',
          name: dog.name,
          description: [dog.breeds.join(' / '), dog.age, dog.size, dog.gender]
            .filter(Boolean)
            .join(' · '),
          ...(dog.photos[0] ? { image: dog.photos[0] } : {}),
          ...(dog.url ? { url: dog.url } : {}),
        },
      })),
    },
  };
}

export interface Faq {
  question: string;
  answer: string;
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

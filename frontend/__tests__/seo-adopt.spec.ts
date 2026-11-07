import { describe, it, expect } from 'vitest';
import { BREEDS, dogMatchesBreed, getBreedBySlug, getPopularBreeds } from '@/lib/seo/breeds';
import { CITIES, getCityBySlug, getMajorCities } from '@/lib/seo/cities';
import { isValidSlug, slugify } from '@/lib/seo/slug';
import { breadcrumbJsonLd, collectionPageJsonLd, faqJsonLd } from '@/lib/seo/structured-data';
import { breedFaqs, breedTemperamentChips, cityFaqs } from '@/lib/seo/adopt-content';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

describe('SEO catalogs', () => {
  it('breed slugs are unique and URL-safe', () => {
    const slugs = BREEDS.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(isValidSlug(slug)).toBe(true);
  });

  it('city slugs are unique, URL-safe, and carry 5-digit zips', () => {
    const slugs = CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of CITIES) {
      expect(isValidSlug(c.slug)).toBe(true);
      expect(c.zip).toMatch(/^\d{5}$/);
      expect(c.state).toMatch(/^[A-Z]{2}$/);
      expect(c.slug.endsWith(`-${c.state.toLowerCase()}`)).toBe(true);
    }
  });

  it('every breed has complete editorial content', () => {
    for (const b of BREEDS) {
      expect(b.summary.length).toBeGreaterThan(120);
      expect(b.goodFor.length).toBeGreaterThanOrEqual(3);
      expect(b.considerations.length).toBeGreaterThanOrEqual(2);
      expect(b.keyword.length).toBeGreaterThan(2);
    }
  });

  it('lookups resolve known slugs and reject unknown ones', () => {
    expect(getBreedBySlug('golden-retriever')?.name).toBe('Golden Retriever');
    expect(getBreedBySlug('not-a-breed')).toBeUndefined();
    expect(getCityBySlug('philadelphia-pa')?.zip).toBe('19107');
    expect(getCityBySlug('nowhere-zz')).toBeUndefined();
  });

  it('has a sensible number of popular breeds and major cities for the sitemap', () => {
    expect(getPopularBreeds().length).toBeGreaterThanOrEqual(15);
    expect(getMajorCities().length).toBeGreaterThanOrEqual(15);
  });
});

describe('breed matching', () => {
  it('matches provider labels by substring and alias', () => {
    const pit = getBreedBySlug('pit-bull-terrier')!;
    expect(dogMatchesBreed(['Pit Bull Terrier'], pit)).toBe(true);
    expect(dogMatchesBreed(['American Staffordshire Terrier', 'Mixed Breed'], pit)).toBe(true);
    expect(dogMatchesBreed(['Labrador Retriever'], pit)).toBe(false);

    const gsd = getBreedBySlug('german-shepherd')!;
    expect(dogMatchesBreed(['German Shepherd Dog'], gsd)).toBe(true);
  });

  it('respects exclusions', () => {
    const collie = getBreedBySlug('collie')!;
    expect(dogMatchesBreed(['Collie'], collie)).toBe(true);
    expect(dogMatchesBreed(['Border Collie'], collie)).toBe(false);
  });
});

describe('slug helpers', () => {
  it('slugifies names consistently', () => {
    expect(slugify('St. Louis, MO')).toBe('st-louis-mo');
    expect(slugify('Shar-Pei')).toBe('shar-pei');
    expect(slugify('  Great  Dane ')).toBe('great-dane');
  });
});

describe('structured data and copy', () => {
  it('builds breadcrumb, collection and FAQ JSON-LD', () => {
    const crumbs = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Adopt', path: '/adopt' }]);
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[1].item).toMatch(/^https:\/\/.+\/adopt$/);

    const collection = collectionPageJsonLd({
      name: 'x',
      description: 'y',
      path: '/adopt/beagle',
      dogs: [
        {
          id: '1',
          name: 'Rex',
          breeds: ['Beagle'],
          age: 'adult',
          size: 'small',
          gender: 'Male',
          photos: ['https://example.com/rex.jpg'],
          publishedAt: '2025-01-01',
          location: { distanceMi: 1 },
          tags: [],
          url: 'https://example.com/rex',
          shelter: { name: 'S', email: '', phone: '' },
        },
      ],
    });
    expect(collection.mainEntity.numberOfItems).toBe(1);
    expect(collection.mainEntity.itemListElement[0].item.image).toBe('https://example.com/rex.jpg');

    const faq = faqJsonLd([{ question: 'Q', answer: 'A' }]);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('A');
  });

  it('generates FAQs and temperament chips from the catalogs', () => {
    const beagle = getBreedBySlug('beagle')!;
    const city = getCityBySlug('austin-tx')!;
    expect(breedFaqs(beagle)).toHaveLength(3);
    expect(breedFaqs(beagle, city)).toHaveLength(4);
    expect(breedFaqs(beagle, city)[0].question).toContain('Austin, TX');
    expect(cityFaqs(city)).toHaveLength(3);
    expect(breedTemperamentChips(beagle).length).toBeGreaterThan(0);
    expect(breedTemperamentChips(getBreedBySlug('havanese')!)).toEqual([]);
  });
});

describe('sitemap and robots', () => {
  it('lists core, breed, city and popular breed x city pages without duplicates', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain('https://dogyenta.com/adopt');
    expect(urls).toContain('https://dogyenta.com/adopt/golden-retriever');
    expect(urls).toContain('https://dogyenta.com/adopt/near/philadelphia-pa');
    expect(urls).toContain('https://dogyenta.com/adopt/golden-retriever/philadelphia-pa');
    const expected =
      6 + BREEDS.length + CITIES.length + getPopularBreeds().length * getMajorCities().length;
    expect(entries).toHaveLength(expected);
    expect(entries.length).toBeLessThan(50000);
  });

  it('keeps private and personalized routes out of the index', () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.disallow).toContain('/api/');
    expect(rule.disallow).toContain('/profile');
    expect(rule.disallow).toContain('/results');
    expect(r.sitemap).toBe('https://dogyenta.com/sitemap.xml');
  });
});

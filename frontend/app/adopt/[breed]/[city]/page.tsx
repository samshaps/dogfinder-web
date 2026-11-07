import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBreedBySlug, getPopularBreeds } from '@/lib/seo/breeds';
import { getCityBySlug, getMajorCities, cityLabel } from '@/lib/seo/cities';
import { getAdoptListings } from '@/lib/seo/listings';
import { ADOPT_PAGE_RADIUS_MILES, getSiteUrl } from '@/lib/seo/site';
import { breadcrumbJsonLd, collectionPageJsonLd, faqJsonLd } from '@/lib/seo/structured-data';
import { breedFaqs } from '@/lib/seo/adopt-content';
import JsonLd from '@/components/adopt/JsonLd';
import Breadcrumbs from '@/components/adopt/Breadcrumbs';
import AdoptDogGrid from '@/components/adopt/AdoptDogGrid';
import AdoptCta from '@/components/adopt/AdoptCta';
import LinkChips from '@/components/adopt/LinkChips';

// Next.js requires a literal here; keep in sync with ADOPT_PAGE_REVALIDATE_SECONDS in lib/seo/site.ts.
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Params = { breed: string; city: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { breed: breedSlug, city: citySlug } = await params;
  const breed = getBreedBySlug(breedSlug);
  const city = getCityBySlug(citySlug);
  if (!breed || !city) return {};
  const listings = await getAdoptListings(breed, city);
  const title = `${breed.plural} for Adoption in ${cityLabel(city)}`;
  const description = `Adoptable ${breed.plural} within ${ADOPT_PAGE_RADIUS_MILES} miles of ${city.city}, ${city.stateName}, from local shelters and rescue groups. Listings refresh hourly, with free AI matching.`;
  const url = `${getSiteUrl()}/adopt/${breed.slug}/${city.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: `${title} | DogYenta`, description },
    twitter: { card: 'summary_large_image', title: `${title} | DogYenta`, description },
    // Thin pages with no dogs listed are kept out of the index until they have content.
    robots: listings.ok && listings.dogs.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function BreedCityPage({ params }: { params: Promise<Params> }) {
  const { breed: breedSlug, city: citySlug } = await params;
  const breed = getBreedBySlug(breedSlug);
  const city = getCityBySlug(citySlug);
  if (!breed || !city) notFound();

  const listings = await getAdoptListings(breed, city);
  const path = `/adopt/${breed.slug}/${city.slug}`;
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Adopt', path: '/adopt' },
    { name: breed.plural, path: `/adopt/${breed.slug}` },
    { name: cityLabel(city), path },
  ];
  const faqs = breedFaqs(breed, city);
  const otherCities = getMajorCities()
    .filter((c) => c.slug !== city.slug)
    .map((c) => ({ label: `${breed.plural} in ${c.city}`, href: `/adopt/${breed.slug}/${c.slug}` }));
  const otherBreeds = getPopularBreeds()
    .filter((b) => b.slug !== breed.slug)
    .map((b) => ({ label: `${b.plural} in ${city.city}`, href: `/adopt/${b.slug}/${city.slug}` }));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 section-gap-lg">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          collectionPageJsonLd({
            name: `${breed.plural} for adoption in ${cityLabel(city)}`,
            description: `Adoptable ${breed.plural} near ${city.city}, ${city.stateName}.`,
            path,
            dogs: listings.dogs,
          }),
          faqJsonLd(faqs),
        ]}
      />

      <header className="text-measure-wide">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="headline">
          {breed.plural} for Adoption in {cityLabel(city)}
        </h1>
        <p className="subhead mt-3">
          {breed.summary.split('. ')[0]}. Below are {breed.plural} listed by shelters and rescue groups within about{' '}
          {ADOPT_PAGE_RADIUS_MILES} miles of {city.city}, refreshed every hour.
        </p>
      </header>

      <section aria-labelledby="listings-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 id="listings-heading" className="text-2xl font-bold text-slate-900">
            Adoptable {breed.plural} near {city.city}
          </h2>
          {listings.ok && listings.total > 0 && (
            <p className="caption">
              Showing {listings.dogs.length} of {listings.total.toLocaleString()} listed
            </p>
          )}
        </div>
        <AdoptDogGrid
          listings={listings}
          emptyHeading={`No ${breed.plural} are listed near ${city.city} right now.`}
          emptyBody={`Try the nationwide ${breed.name} page, widen your search, or set an alert so you hear about the next one first.`}
        />
        <p className="caption mt-3">
          See{' '}
          <Link href={`/adopt/${breed.slug}`} className="text-primary underline underline-offset-2">
            all {breed.plural} for adoption
          </Link>{' '}
          or{' '}
          <Link href={`/adopt/near/${city.slug}`} className="text-primary underline underline-offset-2">
            every adoptable dog near {city.city}
          </Link>
          .
        </p>
      </section>

      <AdoptCta context={`${city.city} ${breed.name}`} />

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-bold text-slate-900 mb-4">
          Adopting a {breed.name} in {city.city}: common questions
        </h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <details key={f.question} className="card p-4 group">
              <summary className="font-medium text-slate-900 cursor-pointer list-none flex justify-between items-center">
                {f.question}
                <span aria-hidden="true" className="text-slate-400 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="body-text mt-2">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <LinkChips id="other-breeds" heading={`Other dogs for adoption in ${city.city}`} links={otherBreeds} />
      <LinkChips id="other-cities" heading={`${breed.plural} in other cities`} links={otherCities} />
    </div>
  );
}

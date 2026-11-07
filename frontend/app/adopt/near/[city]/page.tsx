import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPopularBreeds } from '@/lib/seo/breeds';
import { CITIES, getCityBySlug, cityLabel } from '@/lib/seo/cities';
import { getAdoptListings } from '@/lib/seo/listings';
import { ADOPT_PAGE_RADIUS_MILES, getSiteUrl } from '@/lib/seo/site';
import { breadcrumbJsonLd, collectionPageJsonLd, faqJsonLd } from '@/lib/seo/structured-data';
import { cityFaqs } from '@/lib/seo/adopt-content';
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

type Params = { city: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};
  const listings = await getAdoptListings(undefined, city);
  const title = `Dogs for Adoption in ${cityLabel(city)}`;
  const description = `Browse adoptable dogs from shelters and rescue groups within ${ADOPT_PAGE_RADIUS_MILES} miles of ${city.city}, ${city.stateName}. Listings refresh hourly, with free AI matching to find your fit.`;
  const url = `${getSiteUrl()}/adopt/near/${city.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: `${title} | DogYenta`, description },
    twitter: { card: 'summary_large_image', title: `${title} | DogYenta`, description },
    robots: listings.ok && listings.dogs.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CityPage({ params }: { params: Promise<Params> }) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const listings = await getAdoptListings(undefined, city);
  const path = `/adopt/near/${city.slug}`;
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Adopt', path: '/adopt' },
    { name: cityLabel(city), path },
  ];
  const faqs = cityFaqs(city);
  const breedLinks = getPopularBreeds().map((b) => ({
    label: `${b.plural} in ${city.city}`,
    href: `/adopt/${b.slug}/${city.slug}`,
  }));
  const nearbyCities = CITIES.filter((c) => c.state === city.state && c.slug !== city.slug)
    .concat(CITIES.filter((c) => c.state !== city.state && c.major).slice(0, 8))
    .slice(0, 12)
    .map((c) => ({ label: `Dogs in ${cityLabel(c)}`, href: `/adopt/near/${c.slug}` }));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 section-gap-lg">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          collectionPageJsonLd({
            name: `Dogs for adoption in ${cityLabel(city)}`,
            description: `Adoptable dogs from shelters and rescues near ${city.city}, ${city.stateName}.`,
            path,
            dogs: listings.dogs,
          }),
          faqJsonLd(faqs),
        ]}
      />

      <header className="text-measure-wide">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="headline">Dogs for Adoption in {cityLabel(city)}</h1>
        <p className="subhead mt-3">
          Rescue dogs listed by shelters and rescue groups within about {ADOPT_PAGE_RADIUS_MILES} miles of{' '}
          {city.city}, newest first. Listings refresh every hour, so what you see is what is actually available.
        </p>
      </header>

      <section aria-labelledby="listings-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 id="listings-heading" className="text-2xl font-bold text-slate-900">
            Newest adoptable dogs near {city.city}
          </h2>
          {listings.ok && listings.total > 0 && (
            <p className="caption">
              Showing {listings.dogs.length} of {listings.total.toLocaleString()} listed
            </p>
          )}
        </div>
        <AdoptDogGrid
          listings={listings}
          emptyHeading={`No dogs are listed near ${city.city} right now.`}
          emptyBody="Rescues post new dogs daily. Set an alert and we will email you when a match appears."
        />
        <p className="caption mt-3">
          Want a shortlist instead of a list?{' '}
          <Link href="/find" className="text-primary underline underline-offset-2">
            Take the free matching quiz
          </Link>{' '}
          and we will rank every dog near {city.city} against your lifestyle.
        </p>
      </section>

      <LinkChips id="breeds-heading" heading={`Popular breeds for adoption in ${city.city}`} links={breedLinks} />

      <AdoptCta context={city.city} />

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-bold text-slate-900 mb-4">
          Adopting a dog in {city.city}: common questions
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

      <LinkChips id="nearby-heading" heading="Dogs for adoption in other cities" links={nearbyCities} />
    </div>
  );
}

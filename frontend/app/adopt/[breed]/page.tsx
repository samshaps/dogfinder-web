import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  COAT_LABEL,
  ENERGY_LABEL,
  SIZE_LABEL,
  getBreedBySlug,
  getPopularBreeds,
} from '@/lib/seo/breeds';
import { getMajorCities } from '@/lib/seo/cities';
import { getAdoptListings } from '@/lib/seo/listings';
import { getSiteUrl } from '@/lib/seo/site';
import { breadcrumbJsonLd, collectionPageJsonLd, faqJsonLd } from '@/lib/seo/structured-data';
import { breedFaqs, breedTemperamentChips } from '@/lib/seo/adopt-content';
import JsonLd from '@/components/adopt/JsonLd';
import Breadcrumbs from '@/components/adopt/Breadcrumbs';
import AdoptDogGrid from '@/components/adopt/AdoptDogGrid';
import AdoptCta from '@/components/adopt/AdoptCta';
import LinkChips from '@/components/adopt/LinkChips';

// Next.js requires a literal here; keep in sync with ADOPT_PAGE_REVALIDATE_SECONDS in lib/seo/site.ts.
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  // Rendered on demand and cached; avoids hitting the listings API at build time.
  return [];
}

type Params = { breed: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { breed: slug } = await params;
  const breed = getBreedBySlug(slug);
  if (!breed) return {};
  const title = `${breed.plural} for Adoption Near You`;
  const description = `Meet adoptable ${breed.plural} from shelters and rescues across the US. ${breed.summary.split('. ')[0]}. Listings refresh hourly.`;
  const url = `${getSiteUrl()}/adopt/${breed.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: `${title} | DogYenta`, description },
    twitter: { card: 'summary_large_image', title: `${title} | DogYenta`, description },
  };
}

export default async function BreedPage({ params }: { params: Promise<Params> }) {
  const { breed: slug } = await params;
  const breed = getBreedBySlug(slug);
  if (!breed) notFound();

  const listings = await getAdoptListings(breed);
  const path = `/adopt/${breed.slug}`;
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Adopt', path: '/adopt' },
    { name: breed.plural, path },
  ];
  const faqs = breedFaqs(breed);
  const chips = breedTemperamentChips(breed);
  const cityLinks = getMajorCities().map((c) => ({
    label: `${breed.plural} in ${c.city}, ${c.state}`,
    href: `/adopt/${breed.slug}/${c.slug}`,
  }));
  const relatedBreeds = getPopularBreeds()
    .filter((b) => b.slug !== breed.slug)
    .slice(0, 12)
    .map((b) => ({ label: b.plural, href: `/adopt/${b.slug}` }));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 section-gap-lg">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          collectionPageJsonLd({
            name: `${breed.plural} for adoption`,
            description: breed.summary,
            path,
            dogs: listings.dogs,
          }),
          faqJsonLd(faqs),
        ]}
      />

      <header className="text-measure-wide">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="headline">{breed.plural} for Adoption Near You</h1>
        <p className="subhead mt-3">{breed.summary}</p>
        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="card p-3">
            <dt className="caption">Size</dt>
            <dd className="font-medium text-slate-800">{SIZE_LABEL[breed.size]}</dd>
          </div>
          <div className="card p-3">
            <dt className="caption">Energy</dt>
            <dd className="font-medium text-slate-800">{ENERGY_LABEL[breed.energy]}</dd>
          </div>
          <div className="card p-3">
            <dt className="caption">Coat</dt>
            <dd className="font-medium text-slate-800">{COAT_LABEL[breed.coat]}</dd>
          </div>
          <div className="card p-3">
            <dt className="caption">Weight · Lifespan</dt>
            <dd className="font-medium text-slate-800">
              {breed.weight} · {breed.lifespan}
            </dd>
          </div>
        </dl>
        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Typical temperament">
            {chips.map((chip) => (
              <li key={chip} className="rounded-full bg-blue-50 text-blue-800 px-3 py-1 text-sm">
                {chip}
              </li>
            ))}
          </ul>
        )}
      </header>

      <section aria-labelledby="listings-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 id="listings-heading" className="text-2xl font-bold text-slate-900">
            Adoptable {breed.plural} right now
          </h2>
          {listings.ok && listings.total > 0 && (
            <p className="caption">
              Showing {listings.dogs.length} of {listings.total.toLocaleString()} listed · refreshed hourly
            </p>
          )}
        </div>
        <AdoptDogGrid
          listings={listings}
          emptyHeading={`No ${breed.plural} are listed at the moment.`}
          emptyBody={`${breed.plural} tend to be adopted quickly. New ones are posted every week, and an alert will catch the next one.`}
        />
        <p className="caption mt-3">
          Looking somewhere specific?{' '}
          <Link href="/find" className="text-primary underline underline-offset-2">
            Search by ZIP code
          </Link>{' '}
          to see {breed.plural} within driving distance.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-labelledby="fit-heading">
        <div className="card card-padding">
          <h2 id="fit-heading" className="text-xl font-semibold text-slate-900 mb-3">
            Who {breed.plural} are great for
          </h2>
          <ul className="list-disc pl-5 body-text space-y-1">
            {breed.goodFor.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
        <div className="card card-padding">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Before you adopt a {breed.name}</h2>
          <ul className="list-disc pl-5 body-text space-y-1">
            {breed.considerations.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>

      <AdoptCta context={breed.name} />

      <LinkChips id="cities-heading" heading={`${breed.plural} for adoption by city`} links={cityLinks} />

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-bold text-slate-900 mb-4">
          Adopting a {breed.name}: common questions
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

      <LinkChips id="related-heading" heading="Other breeds people adopt" links={relatedBreeds} />
    </div>
  );
}

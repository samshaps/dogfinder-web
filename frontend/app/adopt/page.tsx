import type { Metadata } from 'next';
import Link from 'next/link';
import { BREEDS } from '@/lib/seo/breeds';
import { CITIES } from '@/lib/seo/cities';
import { getSiteUrl } from '@/lib/seo/site';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import JsonLd from '@/components/adopt/JsonLd';
import AdoptCta from '@/components/adopt/AdoptCta';

export const revalidate = 86400;

const TITLE = 'Adopt a Rescue Dog by Breed or City';
const DESCRIPTION =
  'Browse adoptable rescue dogs by breed and by city across the United States. Listings refresh hourly from shelters and rescue groups, with AI matching to find your fit.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${getSiteUrl()}/adopt` },
  openGraph: {
    type: 'website',
    url: `${getSiteUrl()}/adopt`,
    title: `${TITLE} | DogYenta`,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: `${TITLE} | DogYenta`, description: DESCRIPTION },
};

export default function AdoptHubPage() {
  const breeds = [...BREEDS].sort((a, b) => a.name.localeCompare(b.name));
  const cities = [...CITIES].sort((a, b) => a.city.localeCompare(b.city));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 section-gap-lg">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Adopt', path: '/adopt' }])} />

      <header className="text-measure-wide">
        <h1 className="headline">{TITLE}</h1>
        <p className="subhead mt-3">
          Every dog here is waiting in a shelter or rescue right now. Start with a breed you love or a city you
          live in, then let DogYenta&apos;s matchmaker narrow it down to the dogs that fit your life.
        </p>
      </header>

      <section aria-labelledby="breeds-heading">
        <h2 id="breeds-heading" className="text-2xl font-bold text-slate-900 mb-4">
          Adoptable dogs by breed
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {breeds.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/adopt/${b.slug}`}
                className="block rounded-xl border border-slate-200 px-4 py-3 text-slate-800 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <span className="font-medium">{b.plural}</span>
                <span className="block caption">{b.energy} energy · {b.size}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cities-heading">
        <h2 id="cities-heading" className="text-2xl font-bold text-slate-900 mb-4">
          Adoptable dogs by city
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {cities.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/adopt/near/${c.slug}`}
                className="block rounded-xl border border-slate-200 px-4 py-3 text-slate-800 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <span className="font-medium">{c.city}</span>
                <span className="block caption">{c.stateName}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <AdoptCta context="rescue" />
    </div>
  );
}

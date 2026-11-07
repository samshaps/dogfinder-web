import type { Metadata } from 'next';
import Link from 'next/link';
import { CITIES } from '@/lib/seo/cities';
import { getSiteUrl } from '@/lib/seo/site';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import JsonLd from '@/components/adopt/JsonLd';

export const revalidate = 86400;

const TITLE = 'Dogs for Adoption by City';
const DESCRIPTION =
  'Find adoptable rescue dogs in your city. Live listings from shelters and rescue groups in major US metros, refreshed hourly.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${getSiteUrl()}/adopt/near` },
};

export default function NearIndexPage() {
  const byState = new Map<string, typeof CITIES>();
  for (const c of [...CITIES].sort((a, b) => a.stateName.localeCompare(b.stateName) || a.city.localeCompare(b.city))) {
    byState.set(c.stateName, [...(byState.get(c.stateName) ?? []), c]);
  }
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 section-gap">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Adopt', path: '/adopt' },
          { name: 'By city', path: '/adopt/near' },
        ])}
      />
      <header className="text-measure-wide">
        <h1 className="headline">{TITLE}</h1>
        <p className="subhead mt-3">{DESCRIPTION}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from(byState.entries()).map(([stateName, cities]) => (
          <section key={stateName} aria-labelledby={`state-${cities[0].state}`}>
            <h2 id={`state-${cities[0].state}`} className="text-lg font-semibold text-slate-900 mb-2">
              {stateName}
            </h2>
            <ul className="space-y-1">
              {cities.map((c) => (
                <li key={c.slug}>
                  <Link href={`/adopt/near/${c.slug}`} className="text-primary hover:underline underline-offset-2">
                    Dogs for adoption in {c.city}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

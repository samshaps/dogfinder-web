import Link from 'next/link';
import type { AdoptListings } from '@/lib/seo/listings';
import AdoptDogCard from './AdoptDogCard';

export default function AdoptDogGrid({
  listings,
  emptyHeading,
  emptyBody,
}: {
  listings: AdoptListings;
  emptyHeading: string;
  emptyBody: string;
}) {
  if (!listings.ok) {
    return (
      <div className="card p-6 text-center">
        <p className="text-slate-700 font-medium">Live listings are refreshing right now.</p>
        <p className="body-text mt-1">
          Check back in a few minutes, or{' '}
          <Link href="/find" className="text-primary underline underline-offset-2">
            run a personalized search
          </Link>{' '}
          to see what is available today.
        </p>
      </div>
    );
  }

  if (listings.dogs.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-slate-700 font-medium">{emptyHeading}</p>
        <p className="body-text mt-1">{emptyBody}</p>
        <Link href="/pricing" className="btn-primary-sm mt-4">
          Get an email alert when one is listed
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Adoptable dogs">
      {listings.dogs.map((dog) => (
        <li key={dog.id}>
          <AdoptDogCard dog={dog} />
        </li>
      ))}
    </ul>
  );
}

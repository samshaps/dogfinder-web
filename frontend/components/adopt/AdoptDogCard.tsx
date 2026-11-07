import Image from 'next/image';
import { ExternalLink, MapPin } from 'lucide-react';
import type { Dog } from '@/lib/api';

function titleCase(value: string): string {
  if (!value) return '';
  return value
    .split(/[\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function AdoptDogCard({ dog }: { dog: Dog }) {
  const photo = dog.photos[0];
  const facts = [titleCase(dog.age), titleCase(dog.size), dog.gender !== 'Unknown' ? dog.gender : '']
    .filter(Boolean)
    .join(' · ');
  const place = [dog.city, dog.state].filter(Boolean).join(', ');

  return (
    <article className="card overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-slate-100">
        {photo ? (
          <Image
            src={photo}
            alt={`${dog.name}, a ${dog.breeds.join(' / ')} available for adoption`}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Photo coming soon
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="text-lg font-semibold text-slate-900">{dog.name}</h3>
        <p className="text-sm text-slate-600">{dog.breeds.join(' / ')}</p>
        {facts && <p className="caption">{facts}</p>}
        {(place || (dog.shelter?.name && dog.shelter.name !== 'Unknown Shelter')) && (
          <p className="caption flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {dog.shelter?.name && dog.shelter.name !== 'Unknown Shelter' ? dog.shelter.name : 'Local rescue'}
              {place ? ` · ${place}` : ''}
            </span>
          </p>
        )}
        <div className="mt-auto pt-2">
          {dog.url ? (
            <a
              href={dog.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn-ghost-sm w-full"
            >
              View on rescue site
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
            </a>
          ) : (
            <p className="caption italic">{dog.urlFallbackNote || 'Contact the rescue directly to inquire.'}</p>
          )}
        </div>
      </div>
    </article>
  );
}

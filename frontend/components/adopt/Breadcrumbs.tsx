import Link from 'next/link';
import type { Crumb } from '@/lib/seo/structured-data';

export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="caption mb-4">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-slate-700">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="hover:text-slate-900 underline-offset-2 hover:underline">
                  {c.name}
                </Link>
              )}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

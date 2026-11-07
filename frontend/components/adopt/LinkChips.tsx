import Link from 'next/link';

export interface ChipLink {
  label: string;
  href: string;
}

export default function LinkChips({
  heading,
  links,
  id,
}: {
  heading: string;
  links: ChipLink[];
  id: string;
}) {
  if (links.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold text-slate-900 mb-3">
        {heading}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-block rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

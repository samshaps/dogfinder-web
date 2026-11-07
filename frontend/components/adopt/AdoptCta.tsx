import Link from 'next/link';

export default function AdoptCta({ context }: { context: string }) {
  return (
    <section className="card card-padding bg-surface-gradient" aria-labelledby="adopt-cta-heading">
      <h2 id="adopt-cta-heading" className="text-2xl font-bold text-slate-900">
        Let DogYenta find your match
      </h2>
      <p className="body-text mt-2 text-measure">
        Tell us about your home, schedule, and experience, and our AI matchmaker reads every {context} listing
        to explain which dogs actually fit your life. Pro members get new matches emailed before the good ones
        are gone.
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <Link href="/find" className="btn-primary">
          Get matched for free
        </Link>
        <Link href="/pricing" className="btn-ghost">
          Set up email alerts
        </Link>
      </div>
    </section>
  );
}

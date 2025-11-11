'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/tracking';
import { Logo } from '@/components/Logo';

export default function HomePageClient() {
  const smoothScrollTo = (targetId: string) => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const targetPosition = targetElement.offsetTop - 80; // Account for nav bar
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 1000; // 1 second
      let start: number | null = null;

      const animation = (currentTime: number) => {
        if (start === null) start = currentTime;
        const timeElapsed = currentTime - start;
        const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
      };

      requestAnimationFrame(animation);
    }
  };

  const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  };

  return (
    <div className="min-h-screen bg-surface">

      {/* Hero Section */}
      <div className="bg-surface min-h-[calc(100vh-4rem)] flex items-center">
        <div className="container mx-auto py-6 sm:py-8 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center hero-grid">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <div>
                <h1 className="display text-balance mb-8 max-w-2xl mx-auto lg:mx-0">
                  The smarter way to find your
                  <br className="hidden lg:block" />
                  {" "}<span className="text-blue-600">rescue dog.</span>
                </h1>
                <p className="mt-4 subhead text-measure mx-auto lg:mx-0">
                  Personalized rescue-dog matches for your lifestyle.
                  <br />
                  Because finding your best friend shouldn&apos;t feel like a full-time job.
                </p>
                {/* CTA block nested under copy */}
                <div className="mt-12">
                  <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start">
                    <Link
                      href="/find"
                      onClick={() => trackEvent('homepage_find_top_matches_clicked' as unknown as any)}
                      className="btn-primary btn-lg w-full sm:w-auto"
                    >
                      Find My Top Matches
                    </Link>
                    <button
                      onClick={() => {
                        trackEvent('homepage_see_how_it_works_clicked' as unknown as any);
                        smoothScrollTo('how-it-works');
                      }}
                      className="btn-ghost btn-lg w-full sm:w-auto"
                    >
                      See how it works
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Right: Illustration */}
            <div>
              <div className="relative mx-auto w-full md:max-w-[720px] lg:max-w-[820px] xl:max-w-[900px]">
                <Image
                  src="/hero-dogyenta.png"
                  alt="Matchmaker surrounded by happy rescue dogs"
                  width={1240}
                  height={1240}
                  priority
                  sizes="(max-width: 1024px) 90vw, 900px"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="page-section bg-surface">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">
              How DogYenta works
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="card card-padding">
              <div className="number-badge">
                <span className="number-badge__text">1</span>
              </div>
              <h3>
                Talk to the yenta
              </h3>
              <p className="body-text">
                Tell DogYenta about your lifestyle and what you&apos;re looking for: location, breed preferences, size, temperament, and must-haves.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card card-padding">
              <div className="number-badge">
                <span className="number-badge__text">2</span>
              </div>
              <h3>
                AI analysis
              </h3>
              <p className="body-text">
                Our AI reviews each new Petfinder listing: tags, foster descriptions, and photos to understand the dog&apos;s personality and fit.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card card-padding">
              <div className="number-badge">
                <span className="number-badge__text">3</span>
              </div>
              <h3>
                Your matches, delivered
              </h3>
              <p className="body-text">
                We combine your preferences with the AI&apos;s analysis to highlight the dogs most likely to be your perfect match.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 page-section">
        <div className="container mx-auto">
          <div className="text-center text-white">
            <h2 className="mb-4">
              Ready to find your perfect match?
            </h2>
            <p className="mb-8 text-measure mx-auto text-white">
              Start your search today and discover dogs that fit your lifestyle.
            </p>
            <Link
              href="/find"
              onClick={() => trackEvent('homepage_cta_band_clicked' as unknown as any)}
              className="inline-flex items-center justify-center border border-white/80 bg-transparent px-8 py-4 rounded-xl text-lg font-semibold text-white shadow-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
            >
              <Search className="w-5 h-5 mr-2 text-white" />
              Find My Top Matches
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-surface border-t">
        <div className="container mx-auto py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4">
                <Logo size="md" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

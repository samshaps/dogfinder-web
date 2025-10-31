'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="relative overflow-hidden min-h-screen bg-surface">
      <section className="page-section">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1>About Yenta</h1>
            <p className="mt-2 lead text-measure-wide mx-auto">
              Our mission is to help humans and rescue dogs find their perfect match.
            </p>
          </div>

          {/* Two equal-height cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 justify-items-center">
            {/* Left: How We Help */}
            <div className="card card-padding h-full w-[420px]">
              <h2 className="mb-4">How We Help</h2>
              <div className="body-text leading-7 space-y-4">
                <p>
                  Hunting for the right rescue dog can feel overwhelming. Tons of new dogs get posted each day and rescues move fast! If you're not constantly scrolling rescue sites, it's easy to miss out. DogYenta fixes these issues by using the power of AI to match you with your perfect dog based on the most recent rescues. We also offer an always-on monitoring service to bring the newest matches right to your inbox.
                </p>
              </div>
            </div>

            {/* Right: Why the name */}
            <div className="card card-padding h-full w-[420px]">
              <h2 className="mb-4">Why the name 'Yenta'?</h2>
              <div className="body-text leading-7 space-y-4">
                <p>
                  The name 'Yenta' is inspired by the  matchmaker from the musical 'Fiddler on the Roof'. Just like Yenta, our platform is all about making meaningful connections. Unlike Yenta, we won't pair you up with an age-inappropriate butcher.
                </p>
                <p>
                  We believe finding the right dog is a matchmaking process—a heartfelt quest to unite a loving person with their perfect canine companion. We're here to be your friendly, modern-day Yenta for dog adoption.
                </p>
              </div>
            </div>
          </div>

          {/* CTA removed per layout simplification */}
        </div>
      </section>
    </main>
  );
}



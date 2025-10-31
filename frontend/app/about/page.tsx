'use client';

import Image from 'next/image';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="py-4 sm:py-5">
        <div className="mx-auto max-w-[800px] px-4 sm:px-6">
          {/* Title + Subtitle */}
          <div className="text-center mb-4">
            <h1 className="text-[28px] sm:text-[32px] font-extrabold text-slate-900 mb-1.5">About Yenta</h1>
            <p className="text-[16px] sm:text-[18px] text-slate-600">
              Our mission is to help humans and rescue dogs find their perfect match.
            </p>
          </div>

          {/* Content sections side-by-side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* How We Help */}
            <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-left flex flex-col">
              <h2 className="text-[18px] sm:text-[20px] font-semibold mb-3">How We Help</h2>
              <div className="text-[15px] text-slate-600 leading-7 flex-1">
                <p>
                  Hunting for the right rescue dog can feel overwhelming. Tons of new dogs get posted each day and rescues move fast! If you're not constantly scrolling rescue sites, it's easy to miss out. DogYenta fixes these issues by using the power of AI to match you with your perfect dog based on the most recent rescues. We also offer an always-on monitoring service to bring the newest matches right to your inbox.
                </p>
              </div>
            </section>

            {/* Why the name */}
            <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-left flex flex-col">
              <h2 className="text-[18px] sm:text-[20px] font-semibold mb-3">Why the name 'Yenta'?</h2>
              <div className="text-[15px] text-slate-600 leading-7 space-y-3 flex-1">
                <p>
                  The name 'Yenta' is inspired by the matchmaker from the musical 'Fiddler on the Roof'. Just like Yenta, our platform is all about making meaningful connections. Unlike Yenta, we won't pair you up with an age-inappropriate butcher.
                </p>
                <p>
                  We believe finding the right dog is a matchmaking process—a heartfelt quest to unite a loving person with their perfect canine companion. We're here to be your friendly, modern-day Yenta for dog adoption.
                </p>
              </div>
            </section>
          </div>

          {/* Bottom illustration (provide /public/about-dogs.png) */}
          <div className="mt-4 flex justify-center">
            <Image
              src="/about-dogs.png"
              alt="Row of happy dogs illustration"
              width={1200}
              height={300}
              className="w-full max-w-[900px] h-auto object-contain"
              priority={false}
            />
          </div>
        </div>
      </section>
    </main>
  );
}



'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';

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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🐾</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">DogYenta</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/find" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Find a Dog
                </Link>
                <Link href="/about" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  About
                </Link>
                {/* Contact removed from header globally */}
              </div>
            </div>
            <div className="md:hidden">
              <button className="text-gray-500 hover:text-gray-900">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-6 pt-8 sm:pt-10 lg:pt-12 pb-12 sm:pb-16 lg:pb-20 lg:min-h-[calc(100vh-64px)] lg:flex lg:flex-col lg:justify-center">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            {/* Left: Copy */}
            <div className="lg:col-span-7 text-center sm:text-left flex flex-col justify-center mx-auto sm:mx-0 max-w-[640px]">
              <div>
                <h1 className="hero-title font-extrabold tracking-tight leading-tight text-balance text-3xl sm:text-5xl lg:text-7xl max-w-[20ch] sm:max-w-[20ch] lg:max-w-[16ch] mb-6 text-gray-900 mx-auto sm:mx-0">
                  The smarter way to find your
                  <br className="hidden lg:block" />
                  {" "}<span className="text-blue-600">rescue dog.</span>
                </h1>
                <p className="hero-copy mt-5 text-slate-600 text-base sm:text-lg lg:text-xl leading-relaxed max-w-[55ch] mx-auto sm:mx-0">
                  Personalized rescue-dog matches for your lifestyle.
                  <br />
                  Because finding your best friend shouldn&apos;t feel like a full-time job.
                </p>
                {/* CTA block nested under copy */}
                <div className="mt-8 mx-auto sm:mx-0 w-full">
                  <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
                    <Link
                      href="/find"
                      className="rounded-3xl bg-blue-600 px-6 py-4 sm:px-7 sm:py-4 lg:px-8 lg:py-5 text-white text-base lg:text-lg font-semibold shadow-sm hover:bg-blue-700 active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 w-full sm:w-auto"
                    >
                      Find My Top Matches
                    </Link>
                    <button
                      onClick={() => smoothScrollTo('how-it-works')}
                      className="rounded-3xl bg-white px-6 py-4 sm:px-7 sm:py-4 lg:px-8 lg:py-5 text-slate-900 text-base lg:text-lg font-semibold ring-1 ring-slate-200 hover:bg-slate-50 w-full sm:w-auto"
                    >
                      See how it works
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 text-center sm:text-left">Powered by Petfinder • Updated daily</p>
                </div>
              </div>
            
            </div>
            {/* Right: Illustration */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto w-full max-w-[600px] lg:max-w-[640px]">
              <Image
                  src="/hero-dogyenta.png"
                  alt="Matchmaker surrounded by happy rescue dogs"
                  width={1240}
                  height={1240}
                  priority
                  sizes="(max-width: 1024px) 90vw, 640px"
                  className="w-full h-auto max-h-[500px] lg:max-h-[560px]"
                />
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How DogYenta works
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Talk to the yenta
              </h3>
              <p className="text-gray-600">
                Tell DogYenta about your lifestyle and what you&apos;re looking for—location, breed preferences, size, temperament, and must-haves.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                AI analysis
              </h3>
              <p className="text-gray-600">
                Our AI reviews each new Petfinder listing—tags, foster descriptions, and photos—to understand the dog&apos;s personality and fit.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Your matches, delivered
              </h3>
              <p className="text-gray-600">
                We combine your preferences with the AI&apos;s analysis to highlight the dogs most likely to be your perfect match.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to find your perfect match?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Start your search today and discover dogs that fit your lifestyle.
            </p>
            <Link
              href="/find"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
            >
              <Search className="w-5 h-5 mr-2" />
              Find My Top Matches
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🐾</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">DogYenta</span>
              </div>
              <p className="text-gray-600 mb-4">
                We respect your privacy. We don&apos;t store your data or share it with third parties.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Links</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-gray-900">About</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link></li>
                <li><Link href="/terms" className="text-gray-600 hover:text-gray-900">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/how-it-works" className="text-gray-600 hover:text-gray-900">How it works</Link></li>
                <li><Link href="/faq" className="text-gray-600 hover:text-gray-900">FAQ</Link></li>
                <li><Link href="/help" className="text-gray-600 hover:text-gray-900">Help Center</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">© 2024 PupMatch. All rights reserved.</p>
            <p className="text-gray-500 text-sm mt-2 md:mt-0">Powered by Petfinder API</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

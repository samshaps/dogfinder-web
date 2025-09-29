'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AboutPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <main className="relative overflow-hidden">
      {/* Navigation (same as homepage) */}
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
                <Link href="/about" className="text-gray-900 px-3 py-2 rounded-md text-sm font-semibold">
                  About
                </Link>
                {/* Contact removed from header globally */}
              </div>
            </div>
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle mobile menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/find"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Find a Dog
            </Link>
            <Link
              href="/about"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50 font-semibold"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
          </div>
        </div>
      )}

      <section className="px-6 sm:px-8">
        {/* Tighter overall padding to bring content above the fold */}
        <div className="mx-auto max-w-6xl pt-12 pb-8 sm:py-12">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 text-center">About Yenta</h1>
          <p className="mt-4 text-center text-slate-600 max-w-3xl mx-auto">
            Our mission is to help humans and rescue dogs find their perfect match.
          </p>

          {/* Two equal-height cards, aligned top, closer to headline */}
          <div className="mt-8 grid grid-cols-12 gap-8 md:gap-12 items-stretch">
            {/* Left: How We Help */}
            <div className="col-span-12 md:col-span-6">
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 sm:p-8 h-full">
                <h2 className="text-lg font-semibold text-slate-900">How We Help</h2>
                <div className="mt-3 text-slate-700 leading-7 space-y-4">
                  <p>
                    Hunting for the right rescue dog can feel overwhelming. Tons of new dogs get posted each day and rescues move fast! If you're not constantly scrolling rescue sites, it's easy to miss out. DogYenta fixes these issues by using the power of AI to match you with your perfect dog based on the most recent rescues. We also offer an always-on monitoring service to bring the newest matches right to your inbox.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Why the name */}
            <div className="col-span-12 md:col-span-6">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl shadow-sm p-6 sm:p-8 h-full">
                <h3 className="text-lg font-semibold text-slate-900">Why the name ‘Yenta’?</h3>
                <div className="mt-3 text-slate-700 leading-7 space-y-4">
                  <p>
                    The name ‘Yenta’ is inspired by the  matchmaker from the musical ‘Fiddler on the Roof’. Just like Yenta, our platform is all about making meaningful connections. Unlike Yenta, we won't pair you up with an age-inappropriate butcher.
                  </p>
                  <p>
                    We believe finding the right dog is a matchmaking process—a heartfelt quest to unite a loving person with their perfect canine companion. We’re here to be your friendly, modern-day Yenta for dog adoption.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA raised to sit above the fold */}
          <div className="mt-10 text-center">
            <p className="text-lg text-slate-800">Need more help? Have feedback?</p>
            <Link
              href="/find"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white px-6 py-3 mt-4 text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}



'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/tracking';

export default function PricingPage() {
  useEffect(() => {
    // Track page view
    trackEvent('pricing_page_viewed', {
      source: 'direct',
      authenticated: false, // TODO: Get from auth context when implemented
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Never Miss Your Perfect Pup Again!
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Get instant email alerts when new dogs matching your exact preferences are available.
            Your furry best friend is just an email away.
          </p>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free Plan</h3>
                <div className="text-4xl font-bold mb-4">
                  $0<span className="text-lg text-gray-500">/month</span>
                </div>
                <p className="text-gray-600">Perfect for getting started and finding your ideal dog</p>
              </div>
              
              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save your preferences</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Search for dogs</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Basic matched dog alerts</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Limited search history</span>
                </li>
              </ul>

              <button
                onClick={() => {
                  trackEvent('pricing_cta_free', {
                    authenticated: false,
                  });
                  // TODO: Navigate to signup when auth is implemented
                  alert('Auth not yet implemented - coming in Module 3!');
                }}
                className="w-full bg-gray-100 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Choose Free Plan
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-blue-600 text-white rounded-2xl shadow-xl p-8 border-2 border-blue-700 relative">
              <div className="absolute top-0 right-8 -mt-4 bg-yellow-400 text-blue-900 px-4 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Premium Plan</h3>
                <div className="text-4xl font-bold mb-4">
                  $9.99<span className="text-lg opacity-80">/month</span>
                </div>
                <p className="opacity-90">Unlock advanced features for a truly personalized experience</p>
              </div>
              
              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>All Free Plan features</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Customizable email alerts</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Flexible alert frequency</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Priority notifications</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Expanded search filters</span>
                </li>
              </ul>

              <button
                onClick={() => {
                  trackEvent('pricing_cta_pro', {
                    authenticated: false,
                    currentPlan: 'guest',
                  });
                  // TODO: Navigate to signup when auth is implemented
                  alert('Auth not yet implemented - coming in Module 3!');
                }}
                className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>

          {/* Why DogYenta Email Alerts Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold mb-12">Why DogYenta Email Alerts?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-bold mb-2">Perfect Matches</h3>
                <p className="text-gray-600">
                  Our advanced algorithm connects you with dogs that meet your exact criteria
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold mb-2">Instant Alerts</h3>
                <p className="text-gray-600">
                  Be the first to know about new dogs that match your preferences
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                <p className="text-gray-600">
                  Your preferences and data are safe with us, always
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


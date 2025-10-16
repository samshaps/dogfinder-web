"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleUnsubscribe = async () => {
    if (!email) {
      setResult({ success: false, message: 'No email address provided' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/email-alerts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setResult({ success: true, message: 'Successfully unsubscribed from email alerts' });
    } catch (error) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to unsubscribe' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Unsubscribe from Email Alerts
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Manage your DogFinder email preferences
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {email ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  You're about to unsubscribe <strong>{email}</strong> from DogFinder email alerts.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  You'll no longer receive notifications about new dog matches.
                </p>
              </div>

              {result && (
                <div className={`p-4 rounded-lg ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                      {result.message}
                    </p>
                  </div>
                </div>
              )}

              {!result?.success && (
                <div className="space-y-4">
                  <button
                    onClick={handleUnsubscribe}
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Unsubscribing...
                      </>
                    ) : (
                      'Unsubscribe from Email Alerts'
                    )}
                  </button>

                  <div className="text-center">
                    <Link 
                      href="/"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to DogFinder
                    </Link>
                  </div>
                </div>
              )}

              {result?.success && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    You can always re-enable email alerts by logging into your account and updating your preferences.
                  </p>
                  
                  <div className="space-y-2">
                    <Link 
                      href="/auth/signin"
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign In to Manage Preferences
                    </Link>
                    
                    <Link 
                      href="/"
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Invalid Unsubscribe Link
              </h3>
              <p className="text-sm text-gray-600">
                This unsubscribe link is missing the required email parameter.
              </p>
              <p className="text-sm text-gray-500">
                Please contact support if you need help unsubscribing.
              </p>
              
              <div className="space-y-2">
                <Link 
                  href="/auth/signin"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign In to Manage Preferences
                </Link>
                
                <Link 
                  href="/"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

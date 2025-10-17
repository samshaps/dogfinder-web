"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [alreadyUnsubscribed, setAlreadyUnsubscribed] = useState(false);

  // If the user is logged in, check their current alert status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch('/api/email-alerts');
        if (!mounted) return;
        if (resp.ok) {
          const data = await resp.json();
          if (data?.settings && data.settings.enabled === false) {
            setAlreadyUnsubscribed(true);
          }
        }
      } catch (_e) {
        // ignore – user might be logged out
      } finally {
        if (mounted) setCheckingStatus(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleUnsubscribe = async () => {
    setLoading(true);
    setResult(null);

    try {
      let response: Response;
      if (token) {
        response = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
      } else if (email) {
        response = await fetch('/api/email-alerts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      } else {
        throw new Error('Missing token');
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to unsubscribe');
      setResult({ success: true, message: 'Successfully unsubscribed and cancelled plan' });
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : 'Failed to unsubscribe' });
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
            Unsubscribe and Cancel Plan
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Email alerts are part of the Pro plan. Unsubscribing will also cancel your subscription and downgrade you to Free. You can resubscribe anytime.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {checkingStatus ? (
            <div className="text-center py-8 text-sm text-gray-500">Checking your subscription status…</div>
          ) : (email || token) ? (
            <div className="space-y-6">
              {alreadyUnsubscribed && !result && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    You are already unsubscribed from email alerts and your plan is set to Free.
                  </p>
                  <p className="text-blue-700 text-sm mt-2">
                    Want alerts again? Upgrade to Pro anytime.
                  </p>
                  <div className="mt-4">
                    <a
                      href="/pricing"
                      className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Pro Plans
                    </a>
                  </div>
                </div>
              )}
              {!alreadyUnsubscribed && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  You're about to unsubscribe <strong>{email}</strong> from DogYenta email alerts.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will also <strong>cancel your Pro subscription</strong> and <strong>downgrade your account to Free</strong>.
                </p>
              </div>
              )}

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

              {!alreadyUnsubscribed && !result?.success && (
                <div className="space-y-4">
                  <button
                    onClick={handleUnsubscribe}
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Unsubscribe and Cancel Plan'
                    )}
                  </button>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-4">
                      <Link 
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                      </Link>
                      <Link 
                        href="/pricing"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500"
                      >
                        Upgrade to Pro
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {!alreadyUnsubscribed && result?.success && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    You can re-enable email alerts by upgrading to Pro again from your profile at any time.
                  </p>
                  
                  <div className="space-y-2">
                    <Link 
                      href="/auth/signin"
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign In to Manage Preferences
                    </Link>
                    
                    <Link 
                      href="/pricing"
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Pro Plans
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

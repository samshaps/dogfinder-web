"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ResolveData {
  user_id: string;
  email_masked: string;
  plan_status: 'free' | 'pro' | 'pro_pending_cancel';
  current_period_end: string | null;
  can_unsubscribe: boolean;
  cancel_at_period_end: boolean;
  email_enabled: boolean;
}

interface UnsubscribeResult {
  plan_status: string;
  current_period_end: string | null;
  email_enabled: boolean;
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(!!token);
  const [result, setResult] = useState<UnsubscribeResult | null>(null);
  const [resolveData, setResolveData] = useState<ResolveData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve token if present
  useEffect(() => {
    if (!token) {
      setResolving(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(`/api/unsubscribe/resolve?token=${encodeURIComponent(token)}`);
        if (!mounted) return;
        
        if (!resp.ok) {
          const data = await resp.json();
          const errorMsg = data.error?.message || 'Invalid unsubscribe link';
          
          // Redirect to auth if token is invalid/expired
          if (data.error?.code === 'INVALID_TOKEN' || data.error?.code === 'TOKEN_EXPIRED') {
            router.push(`/auth/signin?redirect=/unsubscribe?token=${encodeURIComponent(token)}`);
            return;
          }
          
          setError(errorMsg);
          setResolving(false);
          return;
        }
        
        const data = await resp.json();
        setResolveData(data);
        setResolving(false);
      } catch (err) {
        if (!mounted) return;
        setError('Failed to load unsubscribe page');
        setResolving(false);
      }
    })();
    
    return () => { mounted = false; };
  }, [token, router]);

  const handleUnsubscribe = async () => {
    if (!token) {
      setError('Missing unsubscribe token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorCode = data.error?.code || '';
        const errorMessage = data.error?.message || data.error || 'Failed to unsubscribe';
        
        if (errorCode === 'TOKEN_EXPIRED') {
          setError('EXPIRED_TOKEN:' + errorMessage);
        } else if (errorCode === 'INVALID_TOKEN') {
          setError('INVALID_TOKEN:' + errorMessage);
        } else if (errorMessage.includes('already been used')) {
          setError('TOKEN_USED:' + errorMessage);
        } else {
          setError(errorMessage);
        }
        return;
      }
      
      setResult(data);
    } catch (err) {
      setError('Failed to unsubscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  // Loading state
  if (resolving) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading unsubscribe page...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (no token or invalid token)
  if (!token || error?.startsWith('INVALID_TOKEN:') || error?.startsWith('EXPIRED_TOKEN:')) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
            <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invalid Unsubscribe Link
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {error?.includes('EXPIRED') 
                ? 'This unsubscribe link has expired. Please request a new one from your email settings.'
                : 'This unsubscribe link is invalid or has been tampered with.'}
            </p>
            <div className="mt-6 space-y-3">
              <Link
                href="/auth/signin?redirect=/unsubscribe"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                Sign In to Manage Preferences
              </Link>
              <Link
                href="/profile"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
              >
                Go to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (result) {
    const periodEndDate = result.current_period_end ? formatDate(result.current_period_end) : '';
    const isPro = result.plan_status === 'pro_pending_cancel' || result.plan_status === 'pro';
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
              You're unsubscribed
            </h1>
            <div className="mt-6 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              {isPro && periodEndDate ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Email alerts are off. Your Pro plan remains active until <strong>{periodEndDate}</strong>. We'll downgrade you to Free after that.
                  </p>
                  <div className="space-y-3">
                    <Link
                      href="/profile#billing"
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Manage subscription
                    </Link>
                    <button
                      onClick={() => {
                        // Toggle alerts back on (if they change their mind)
                        fetch('/api/email-alerts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ enabled: true })
                        }).then(() => {
                          setResult(null);
                          setResolveData(null);
                        });
                      }}
                      className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Turn alerts back on
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Email alerts are off.
                  </p>
                  <Link
                    href="/profile"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Profile
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main unsubscribe form
  const data = resolveData;
  const periodEndDate = data?.current_period_end ? formatDate(data.current_period_end) : '';
  const alreadyCancelled = data?.cancel_at_period_end && data?.current_period_end;
  const isFree = data?.plan_status === 'free';
  const showEmailBanner = false; // Token user info is already shown via resolveData.email_masked

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            Unsubscribe from Email Alerts
          </h1>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {showEmailBanner && data?.email_masked && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                Changes will be applied to <strong>{data.email_masked}</strong>
              </p>
            </div>
          )}

          {alreadyCancelled && periodEndDate ? (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Cancellation already scheduled for <strong>{periodEndDate}</strong>. Email alerts are now off.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-6">
                Unsubscribing will turn off email alerts immediately and cancel your Pro plan at the end of your current billing period. You'll keep Pro benefits until then.
              </p>

              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">This will:</p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>Turn off email alerts now</li>
                  {!isFree && periodEndDate && (
                    <li>Keep Pro through <strong>{periodEndDate}</strong></li>
                  )}
                  <li>Cancel plan at period end → downgrade to Free</li>
                </ul>
              </div>

              {error && !error.startsWith('TOKEN_USED:') && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {error?.startsWith('TOKEN_USED:') && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This unsubscribe link has already been used. Your subscription is already cancelled. If you need help, please contact support.
                  </p>
                </div>
              )}

              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    <span>Unsubscribe (alerts off now, cancel at period end)</span>
                  </>
                )}
              </button>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-center gap-6">
                  <Link
                    href="/profile"
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Manage preferences
                  </Link>
                </div>
              </div>
            </>
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

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
      if (!response.ok) {
        // Handle specific error types from API
        const errorCode = data.error?.code || '';
        const errorMessage = data.error?.message || data.error || 'Failed to unsubscribe';
        
        // Map error codes to user-friendly messages with guidance
        if (errorCode === 'TOKEN_EXPIRED') {
          throw new Error('EXPIRED_TOKEN:' + errorMessage);
        } else if (errorCode === 'INVALID_TOKEN') {
          throw new Error('INVALID_TOKEN:' + errorMessage);
        } else if (errorMessage.includes('already been used') || errorMessage.includes('already processed')) {
          throw new Error('TOKEN_USED:' + errorMessage);
        } else {
          throw new Error(errorMessage);
        }
      }
      setResult({ success: true, message: 'Successfully unsubscribed and cancelled plan' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to unsubscribe';
      setResult({ success: false, message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-blue-600" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            Unsubscribe from Email Alerts
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
            Email alerts are part of our Pro plan. Unsubscribing will cancel your Pro subscription and downgrade your account to Free. You can resubscribe anytime.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {checkingStatus ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Checking your subscription status…</span>
              </div>
              <p className="text-xs text-gray-500">This may take a moment</p>
            </div>
          ) : (email || token) ? (
            <div className="space-y-6">
              {alreadyUnsubscribed && !result && (
                <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200" role="alert">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">Already Unsubscribed</h3>
                      <p className="text-blue-800 text-sm mb-3">
                        You're already unsubscribed from email alerts and your account is set to Free.
                      </p>
                      <p className="text-blue-700 text-sm mb-4">
                        Want to get email alerts again? Upgrade to Pro anytime to start receiving notifications about new dog matches.
                      </p>
                      <a
                        href="/pricing"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        View Pro Plans
                      </a>
                    </div>
                  </div>
                </div>
              )}
              {!alreadyUnsubscribed && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Unsubscribe</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    You're about to unsubscribe <strong className="text-gray-900">{email}</strong> from DogYenta email alerts.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                    <p className="text-sm text-red-800 font-medium mb-2">⚠️ This action will:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Cancel your Pro subscription immediately</li>
                      <li>• Downgrade your account to Free plan</li>
                      <li>• Stop all email alerts for new dog matches</li>
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    You can resubscribe anytime from your profile or the pricing page.
                  </p>
                </div>
              </div>
              )}

              {result && (
                <>
                  {result.success ? (
                    <div className="p-6 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200" role="alert">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2 text-green-900">
                            Successfully Unsubscribed
                          </h3>
                          <p className="text-sm text-green-700">
                            {result.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-6 rounded-lg border ${
                      result.message.startsWith('EXPIRED_TOKEN:') || result.message.startsWith('INVALID_TOKEN:')
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                        : result.message.startsWith('TOKEN_USED:')
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                        : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                    }`} role="alert">
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                          result.message.startsWith('EXPIRED_TOKEN:') || result.message.startsWith('INVALID_TOKEN:')
                            ? 'text-amber-600'
                            : result.message.startsWith('TOKEN_USED:')
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`} aria-hidden="true" />
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold mb-2 ${
                            result.message.startsWith('EXPIRED_TOKEN:') || result.message.startsWith('INVALID_TOKEN:')
                              ? 'text-amber-900'
                              : result.message.startsWith('TOKEN_USED:')
                              ? 'text-blue-900'
                              : 'text-red-900'
                          }`}>
                            {result.message.startsWith('EXPIRED_TOKEN:') 
                              ? 'Unsubscribe Link Expired'
                              : result.message.startsWith('INVALID_TOKEN:')
                              ? 'Invalid Unsubscribe Link'
                              : result.message.startsWith('TOKEN_USED:')
                              ? 'Link Already Used'
                              : 'Unsubscribe Failed'}
                          </h3>
                          <p className={`text-sm mb-3 ${
                            result.message.startsWith('EXPIRED_TOKEN:') || result.message.startsWith('INVALID_TOKEN:')
                              ? 'text-amber-800'
                              : result.message.startsWith('TOKEN_USED:')
                              ? 'text-blue-800'
                              : 'text-red-700'
                          }`}>
                            {result.message.includes(':') ? result.message.split(':').slice(1).join(':') : result.message}
                          </p>
                          
                          {/* Show specific guidance for token errors */}
                          {(result.message.startsWith('EXPIRED_TOKEN:') || result.message.startsWith('INVALID_TOKEN:')) && (
                            <div className={`mt-4 p-4 rounded-lg ${
                              result.message.startsWith('EXPIRED_TOKEN:') || result.message.startsWith('INVALID_TOKEN:')
                                ? 'bg-amber-100 border border-amber-200'
                                : ''
                            }`}>
                              <p className="text-sm font-medium text-amber-900 mb-2">What you can do:</p>
                              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                                <li>Sign in to your account and manage email preferences from your profile</li>
                                <li>Request a new unsubscribe link from your email alert settings</li>
                                <li>Contact support if you need assistance</li>
                              </ul>
                            </div>
                          )}
                          
                          {result.message.startsWith('TOKEN_USED:') && (
                            <div className="mt-4 p-4 rounded-lg bg-blue-100 border border-blue-200">
                              <p className="text-sm text-blue-900 mb-2">
                                <strong>Good news:</strong> Your subscription has already been cancelled and you're unsubscribed from email alerts. 
                                You can re-enable email alerts anytime by upgrading to Pro again.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!alreadyUnsubscribed && !result?.success && (
                <div className="space-y-6">
                  <button
                    onClick={handleUnsubscribe}
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-3 py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                    aria-describedby="unsubscribe-warning"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing unsubscribe...</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" aria-hidden="true" />
                        <span>Unsubscribe and Cancel Plan</span>
                      </>
                    )}
                  </button>
                  
                  <p id="unsubscribe-warning" className="text-xs text-gray-500 text-center">
                    This action cannot be undone. You can resubscribe anytime.
                  </p>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-center gap-6">
                      <Link 
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                        Back to Home
                      </Link>
                      <Link 
                        href="/pricing"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Keep Pro Plan
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {!alreadyUnsubscribed && result?.success && (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Unsubscribe Complete</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      You've been successfully unsubscribed from email alerts and your account has been downgraded to Free.
                    </p>
                    <p className="text-xs text-gray-500">
                      You can re-enable email alerts by upgrading to Pro again from your profile at any time.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Link 
                      href="/auth/signin"
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign In to Manage Preferences
                    </Link>
                    
                    <Link 
                      href="/pricing"
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      View Pro Plans
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-6" role="alert">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Unsubscribe Link</h3>
                <p className="text-sm text-gray-600 mb-3">
                  This unsubscribe link is missing required information. Unsubscribe links are valid for 7 days after they're sent.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-4">
                  <p className="text-sm font-medium text-amber-900 mb-2">What you can do:</p>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Sign in to your account to manage email preferences from your profile page</li>
                    <li>Check your email for a newer unsubscribe link</li>
                    <li>Contact support if you continue to have issues</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-3">
                <Link 
                  href="/auth/signin"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In to Manage Preferences
                </Link>
                
                <Link 
                  href="/"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
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

'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, MapPin, Home, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { listDogs, type Dog as APIDog } from '@/lib/api';
import { type UserPreferences, type MatchingResults, type Dog } from '@/lib/schemas';
import PhotoCarousel from '@/components/PhotoCarousel';
import PreferencesSummary from '@/components/PreferencesSummary';
import { COPY_MAX } from '@/lib/constants/copyLimits';
import CopyLinkButton from '@/components/CopyLinkButton';
import { normalizeDogGender } from '@/lib/utils/pronouns';
import { trackEvent } from '@/lib/analytics/tracking';
import { useUser } from '@/lib/auth/user-context';
import { getUserPlan, canViewPrefs } from '@/lib/stripe/plan-utils';

// Convert API Dog to schemas Dog
function mapAPIDogToDog(apiDog: APIDog): Dog {
  const normalizedGender = normalizeDogGender(apiDog.gender);
  const genderLabel = normalizedGender === 'male' ? 'Male' : normalizedGender === 'female' ? 'Female' : 'Unknown';
  return {
    id: apiDog.id,
    name: apiDog.name,
    breeds: apiDog.breeds,
    age: apiDog.age.toLowerCase(),
    size: apiDog.size.toLowerCase(),
    energy: apiDog.tags.includes('high energy') ? 'high' : apiDog.tags.includes('low energy') ? 'low' : 'medium',
    temperament: apiDog.tags.filter(tag => 
      ['affectionate', 'playful', 'calm', 'quiet', 'kid-friendly', 'cat-friendly', 'low-maintenance'].includes(tag.toLowerCase())
    ),
    location: { 
      distanceMi: apiDog.location.distanceMi 
    },
    hypoallergenic: apiDog.tags.some(tag => tag.toLowerCase().includes('hypoallergenic')),
    shedLevel: apiDog.tags.some(tag => tag.toLowerCase().includes('low shed')) ? 'low' : 
               apiDog.tags.some(tag => tag.toLowerCase().includes('high shed')) ? 'high' : 'med',
    groomingLoad: apiDog.tags.some(tag => tag.toLowerCase().includes('low grooming')) ? 'low' :
                  apiDog.tags.some(tag => tag.toLowerCase().includes('high grooming')) ? 'high' : 'med',
    barky: apiDog.tags.some(tag => tag.toLowerCase().includes('barky')),
    rawDescription: apiDog.description || apiDog.tags.join(', '),
    gender: genderLabel,
    photos: apiDog.photos,
    publishedAt: apiDog.publishedAt,
    city: '',
    state: '',
    tags: apiDog.tags,
    url: apiDog.url,
    shelter: apiDog.shelter
  };
}

function pickCitedPreference(userPreferences?: UserPreferences): string | null {
  if (!userPreferences) return null;
  if (userPreferences.age && userPreferences.age.length > 0) return `${userPreferences.age[0]} age`;
  if (userPreferences.size && userPreferences.size.length > 0) return `${userPreferences.size[0]} size`;
  if (userPreferences.energy) return `${userPreferences.energy} energy`;
  if (userPreferences.temperament && userPreferences.temperament.length > 0) return userPreferences.temperament[0];
  return null;
}

function TopPickCard({ dog, onPhotoClick, userPreferences, analysis }: { dog: APIDog; onPhotoClick: (dog: APIDog) => void; userPreferences?: UserPreferences; analysis?: any }) {
  // Use the analysis data directly from the new matching system
  const aiReasoning = analysis?.reasons?.primary150 ? {
    primary: analysis.reasons.primary150,
    additional: [],
    concerns: []
  } : null;
  const fallbackPrimary = (() => {
    const cite = pickCitedPreference(userPreferences);
    return cite ? `Matches your ${cite}.` : 'Great potential as a loving companion';
  })();

  // Convert dog.photos (string[]) to Photo[] format
  const photos = dog.photos?.map(photoUrl => ({ url: photoUrl, alt: `${dog.name}'s photo` })) || [];

  return (
    <div className="card overflow-hidden w-[360px] flex flex-col">
      <div className="relative">
        <div className="aspect-square relative">
          {photos.length > 0 ? (
            <PhotoCarousel
              photos={photos}
              dogName={dog.name}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-none">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
      </div>
      
      <div className="card-padding flex flex-col h-full">
        <div className="mb-4">
          <h3 className="text-[20px] font-bold text-gray-900">{dog.name}</h3>
          <p className="text-[14px] text-gray-600">{dog.breeds.join(', ')}</p>
        </div>
        
        {/* (Removed) Matches chips: we now fold key matches into the blue reasoning card */}

        {/* Things to consider removed per simplified AI UI */}

        {/* AI Match Reason - Dynamic */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <Home className="w-3 h-3 text-blue-600" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-blue-900 mb-1">Why this dog is perfect for you:</p>
              <p className="text-[14px] text-blue-800">{aiReasoning ? aiReasoning.primary : fallbackPrimary}</p>
            </div>
          </div>
        </div>
        
        {/* Distance */}
        {dog.location.distanceMi > 0 && (
          <div className="flex items-center gap-2 mt-4 text-[14px] text-gray-600">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{Math.round(dog.location.distanceMi)} miles away</span>
          </div>
        )}
        
        {/* Location and Distance */}
        <div className="flex items-center gap-2 mb-4 text-[14px] text-gray-600">
          <ExternalLink className="w-4 h-4 text-gray-500" />
          <span>{dog.shelter.name}</span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-nowrap mt-auto">
          <a
            href={dog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary-sm whitespace-nowrap"
            onClick={() => trackEvent('results_listing_link_clicked', {
              dog_id: dog.id,
              dog_name: dog.name,
              source: 'top_pick'
            })}
          >
            View full listing
          </a>
          <CopyLinkButton
            text={dog.url}
            className="btn-ghost-sm p-2 w-9 h-9 flex items-center justify-center shrink-0"
            iconClassName="w-4 h-4 text-gray-700"
            onCopy={() => trackEvent('results_dog_link_copied', {
              dog_id: dog.id,
              dog_name: dog.name,
              source: 'top_pick'
            })}
          />
        </div>
      </div>
    </div>
  );
}

function DogCard({ dog, onPhotoClick, userPreferences, analysis }: { dog: APIDog; onPhotoClick: (dog: APIDog) => void; userPreferences?: UserPreferences; analysis?: any }) {
  // Use the analysis data directly from the new matching system
  // All Matches: no AI guidance rendered
  const shortAIReasoning = '';

  // Convert dog.photos (string[]) to Photo[] format
  const photos = dog.photos?.map(photoUrl => ({ url: photoUrl, alt: `${dog.name}'s photo` })) || [];

  return (
    <div className="card overflow-hidden hover:shadow-lg transition-shadow w-[320px] flex flex-col">
      <div className="aspect-square relative">
        {photos.length > 0 ? (
          <PhotoCarousel
            photos={photos}
            dogName={dog.name}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="card-padding flex flex-col h-full">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-[18px]">{dog.name}</h3>
          <p className="text-[14px] text-gray-600">{dog.breeds.join(', ')}</p>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="text-[14px] text-gray-600">
            {dog.age} • {dog.size}
          </div>
          
          {/* Matches chips removed for simplified UI */}

          {/* Things to consider removed */}
          
          {/* Removed tag bubbles for cleaner UI */}
        </div>
        
        {dog.location.distanceMi > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-[12px] text-gray-600">
              {Math.round(dog.location.distanceMi)} miles away
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <ExternalLink className="w-4 h-4 text-gray-500" />
          <span className="text-[12px] text-gray-600">{dog.shelter.name}</span>
        </div>
        
        {/* AI Note removed for All Matches */}
        
        <div className="mt-auto flex gap-2">
          <a
            href={dog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 btn-primary text-sm"
            onClick={() => trackEvent('results_listing_link_clicked', {
              dog_id: dog.id,
              dog_name: dog.name,
              source: 'all_matches'
            })}
          >
            View full listing
          </a>
          <CopyLinkButton
            text={dog.url}
            className="btn-ghost text-sm flex items-center justify-center w-11 h-11 rounded-xl border border-slate-300"
            iconClassName="w-4 h-4"
            onCopy={() => trackEvent('results_dog_link_copied', {
              dog_id: dog.id,
              dog_name: dog.name,
              source: 'all_matches'
            })}
          />
        </div>
      </div>
    </div>
  );
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [dogs, setDogs] = useState<APIDog[]>([]);
  const [topPicks, setTopPicks] = useState<APIDog[]>([]);
  const [matchingResults, setMatchingResults] = useState<MatchingResults | null>(null);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDog, setSelectedDog] = useState<APIDog | null>(null);
  const [planInfo, setPlanInfo] = useState<{ planType?: string; isPro?: boolean } | null>(null);
  const hasTriggeredAutoCheckout = useRef(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Extract search parameters
  const searchQuery = useMemo(() => ({
    zip: searchParams.get('zip') || '',
    radius: parseInt(searchParams.get('radius') || '100'),
    age: searchParams.get('age')?.split(',') || [],
    size: searchParams.get('size')?.split(',') || [],
    includeBreeds: searchParams.get('includeBreeds')?.split(',') || [],
    excludeBreeds: searchParams.get('excludeBreeds')?.split(',') || [],
    temperament: searchParams.get('temperament')?.split(',') || [],
    energy: searchParams.get('energy') || '',
    guidance: searchParams.get('guidance') || '',  // ADD GUIDANCE EXTRACTION
    t_age: searchParams.get('t_age') === '1',
    t_size: searchParams.get('t_size') === '1',
    t_energy: searchParams.get('t_energy') === '1',
    t_temperament: searchParams.get('t_temperament') === '1',
    t_breedsInclude: searchParams.get('t_breedsInclude') === '1',
    t_breedsExclude: searchParams.get('t_breedsExclude') === '1',
    page: currentPage,
    limit: 20
  }), [searchParams, currentPage]);

  // Scroll to top when page loads or search params change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams]);

  // Track page view (only once on mount)
  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
    
    // Extract values directly from searchParams for initial tracking
    const zip = searchParams.get('zip') || '';
    const age = searchParams.get('age')?.split(',') || [];
    const size = searchParams.get('size')?.split(',') || [];
    const includeBreeds = searchParams.get('includeBreeds')?.split(',') || [];
    const excludeBreeds = searchParams.get('excludeBreeds')?.split(',') || [];
    const temperament = searchParams.get('temperament')?.split(',') || [];
    const energy = searchParams.get('energy') || '';
    const guidance = searchParams.get('guidance') || '';
    
    trackEvent('results_viewed', {
      has_zip: !!zip,
      has_age: age.length > 0,
      has_size: size.length > 0,
      has_breeds_include: includeBreeds.length > 0,
      has_breeds_exclude: excludeBreeds.length > 0,
      has_temperament: temperament.length > 0,
      has_energy: !!energy,
      has_guidance: !!guidance
    });
  }, [searchParams]);

  // Ensure URL contains default radius=100 if not provided
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentRadius = searchParams.get('radius');
    if (!currentRadius) {
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      sp.set('radius', '100');
      const newUrl = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams]);

  // Load plan info when user is authenticated
  useEffect(() => {
    const loadPlanInfo = async () => {
      if (!user) {
        setPlanInfo(null);
        return;
      }

      try {
        const plan = await getUserPlan(user.id);
        setPlanInfo(plan);
      } catch (error) {
        console.error('❌ Failed to load plan info:', error);
        setPlanInfo(null);
      }
    };

    loadPlanInfo();
  }, [user]);

  // Check for upgrade success parameter and show success message
  useEffect(() => {
    const upgradeSuccess = searchParams.get('upgrade');
    if (upgradeSuccess === 'success') {
      setShowSuccessMessage(true);
      
      // Call backend endpoint to verify checkout completion
      const verifyCheckout = async () => {
        try {
          const response = await fetch('/api/analytics/checkout-success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.verified) {
              // Backend verified checkout - track the event
              trackEvent('checkout_success', {
                source: 'results_page',
                plan: data.plan || 'pro',
                verified: true,
              });
            }
          } else {
            console.warn('⚠️ Checkout verification failed:', response.status);
            // Still track the event even if verification fails (user might have just upgraded)
            trackEvent('checkout_success', {
              source: 'results_page',
              verified: false,
            });
          }
        } catch (error) {
          console.error('❌ Error verifying checkout:', error);
          // Still track the event
          trackEvent('checkout_success', {
            source: 'results_page',
            verified: false,
            error: 'verification_failed',
          });
        }
      };

      verifyCheckout();
      
      // Remove upgrade param from URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('upgrade');
      const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams]);

  // Auto-trigger checkout after sign-in if user wants to upgrade
  useEffect(() => {
    const upgradeParam = searchParams.get('upgrade');
    if (upgradeParam === 'true' && user && planInfo && !canViewPrefs(planInfo) && !hasTriggeredAutoCheckout.current) {
      hasTriggeredAutoCheckout.current = true;
      
      // Remove upgrade param from URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('upgrade');
      const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
      window.history.replaceState(null, '', newUrl);
      
      // Auto-trigger checkout
      handleAlertsCTA('top');
    }
  }, [user, planInfo, searchParams]);

  // Extract user preferences for AI reasoning (memoized to prevent infinite loops)
  const userPreferences: UserPreferences = useMemo(() => ({
    zipCodes: [searchQuery.zip].filter(Boolean),
    radiusMi: searchQuery.radius,
    breedsInclude: searchQuery.t_breedsInclude ? searchQuery.includeBreeds : undefined,
    breedsExclude: searchQuery.t_breedsExclude ? searchQuery.excludeBreeds : undefined,
    age: searchQuery.t_age ? (searchQuery.age as ("baby" | "young" | "adult" | "senior")[]) : undefined,
    size: searchQuery.t_size ? (searchQuery.size as ("small" | "medium" | "large" | "xl")[]) : undefined,
    energy: searchQuery.t_energy ? ((searchQuery.energy || undefined) as "low" | "medium" | "high" | undefined) : undefined,
    temperament: searchQuery.t_temperament ? (searchQuery.temperament as ("eager-to-please" | "intelligent" | "focused" | "adaptable" | "independent-thinker" | "loyal" | "protective" | "confident" | "gentle" | "sensitive" | "playful" | "calm-indoors" | "alert-watchful" | "quiet" | "companion-driven")[]) : undefined,
    guidance: searchQuery.guidance,
    touched: {
      age: searchQuery.t_age,
      size: searchQuery.t_size,
      energy: searchQuery.t_energy,
      temperament: searchQuery.t_temperament,
      breedsInclude: searchQuery.t_breedsInclude,
      breedsExclude: searchQuery.t_breedsExclude,
    }
  }), [searchQuery]);
  
  // DEBUG TRACE GUIDANCE
  console.log('🔍 RESULTS PAGE DEBUG: searchQuery extracted:', {
    guidance: searchQuery.guidance,
    age: searchQuery.age,
    size: searchQuery.size,
    temperament: searchQuery.temperament,
    excludeBreeds: searchQuery.excludeBreeds
  });
  console.log('🔍 RESULTS PAGE DEBUG: userPreferences for AI:', userPreferences);
  
  // Filter dogs to only include those with photos (but fall back to all dogs if none have photos)
  const filterDogsWithPhotos = (dogs: APIDog[]) => {
    const withPhotos = dogs.filter(dog => dog.photos && dog.photos.length > 0);
    return withPhotos.length > 0 ? withPhotos : dogs;
  };

  // Modal handlers
  const handlePhotoClick = (dog: APIDog) => {
    setSelectedDog(dog);
  };

  const handleCloseModal = () => {
    setSelectedDog(null);
  };

  // Handle upgrade/checkout flow
  const handleAlertsCTA = async (location: 'top' | 'inline') => {
    // Track CTA click
    trackEvent('alerts_cta_clicked', {
      location,
      user_authenticated: !!user,
      current_plan: planInfo?.planType || 'free'
    });

    // If user is not authenticated, redirect to sign-in with callback
    if (!user) {
      const currentUrl = window.location.pathname + window.location.search;
      // Add upgrade=true parameter to indicate user wants to upgrade
      const callbackUrl = encodeURIComponent(`${currentUrl}${currentUrl.includes('?') ? '&' : '?'}upgrade=true`);
      window.location.href = `/auth/signin?callbackUrl=${callbackUrl}`;
      return;
    }

    // If user is authenticated but not Pro, trigger Stripe checkout
    if (!canViewPrefs(planInfo)) {
      try {
        trackEvent('stripe_checkout_started', {
          source: 'results_page',
          location,
          current_plan: planInfo?.planType || 'free'
        });

        // Pass current results page URL as return URL
        const currentUrl = window.location.pathname + window.location.search;
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnUrl: currentUrl }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const responseData = await response.json();
        const { url, reactivated } = responseData;
        
        if (reactivated) {
          // Subscription was reactivated - redirect to profile page
          window.location.href = url || '/profile?upgrade=success&reactivated=true';
        } else if (url) {
          // New subscription - redirect to Stripe checkout
          window.location.href = url;
        } else {
          throw new Error('No URL returned from API');
        }
      } catch (error) {
        console.error('Error starting checkout:', error);
        alert('Failed to start upgrade process. Please try again.');
      }
    }
  };

  // Create a fingerprint for de-duplication (frontend safety net)
  const createDogFingerprint = (dog: APIDog): string => {
    const name = (dog.name || '').trim().toLowerCase();
    const breeds = dog.breeds.join(',').toLowerCase();
    const age = (dog.age || '').trim().toLowerCase();
    const size = (dog.size || '').trim().toLowerCase();
    const gender = (dog.gender || '').trim().toLowerCase();
    
    return `${name}|||${breeds}|||${age}|||${size}|||${gender}`;
  };

  // Fetch dogs data
  useEffect(() => {
    async function fetchDogs() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await listDogs(searchQuery);
        
        // Frontend de-duplication as safety net
        const seenFingerprints = new Set<string>();
        const uniqueDogs = response.items.filter(dog => {
          const fingerprint = createDogFingerprint(dog);
          if (seenFingerprints.has(fingerprint)) {
            return false;
          }
          seenFingerprints.add(fingerprint);
          return true;
        });
        
        const dogsWithPhotos = filterDogsWithPhotos(uniqueDogs);
        setDogs(dogsWithPhotos);
        setTotalPages(Math.ceil(dogsWithPhotos.length / response.pageSize));
        
        // Set loading to false immediately after dogs are loaded
        setLoading(false);
        
        // Start AI matching in parallel (non-blocking)
        startAIMatching(dogsWithPhotos);
        
      } catch (err) {
        console.error('❌ Error fetching dogs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dogs');
        setLoading(false);
      }
    }
    
    fetchDogs();
  }, [searchQuery]);

  // Separate function for AI matching
  const startAIMatching = async (dogsWithPhotos: APIDog[]) => {
    try {
      setMatchingLoading(true);
      console.log('🎯 NEW MATCHING: Starting matching process...');
      
      const matchingResponse = await fetch('/api/match-dogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPreferences: userPreferences,
          dogs: dogsWithPhotos.map(mapAPIDogToDog)
        })
      });
      
      if (!matchingResponse.ok) {
        throw new Error(`Matching API error: ${matchingResponse.status}`);
      }
      
      const payload = await matchingResponse.json();
      // eslint-disable-next-line no-console
      console.log('🧩 Matching payload:', payload);
      const results: MatchingResults = payload?.results ?? payload;
      // eslint-disable-next-line no-console
      console.log('🧩 Matching results summary:', {
        topMatches: results?.topMatches?.length || 0,
        allMatches: results?.allMatches?.length || 0,
        expansionNotes: results?.expansionNotes?.length || 0,
      });
      setMatchingResults(results);
      // eslint-disable-next-line no-console
      console.log('🧩 Reasons presence:', {
        topHasReasons: (results?.topMatches || []).filter(m => m?.reasons?.primary150)?.length,
        allHasBlurbs: (results?.allMatches || []).filter(m => m?.reasons?.blurb50)?.length,
      });
      if ((results?.topMatches || []).length > 0) {
        const sample = (results.topMatches[0] || {}).reasons;
        // eslint-disable-next-line no-console
        console.log('🧩 Sample top reason:', sample);
      }
      
      // Extract top picks from matching results (convert back to API dogs)
      const topPicksDogs = (results?.topMatches ?? []).map((match: any) => 
        dogsWithPhotos.find(dog => dog.id === match.dogId)
      ).filter(Boolean) as APIDog[];
      // eslint-disable-next-line no-console
      console.log('🧩 Top picks resolved to', topPicksDogs.length, 'dogs');
      
      if (topPicksDogs.length === 0) {
        // Fallback: take first 3 dogs with photos
        setTopPicks(dogsWithPhotos.slice(0, 3));
        setShowFallbackBanner(false);
      } else {
        setTopPicks(topPicksDogs);
        setShowFallbackBanner(false);
      }
    } catch (matchingError) {
      console.error('❌ Matching API error:', matchingError);
      // Fallback to simple filtering if matching API fails
      setTopPicks(dogsWithPhotos.slice(0, 3));
      setShowFallbackBanner(true); // Show banner that AI matching failed
    } finally {
      setMatchingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dogs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">❌ Error</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Convert selectedDog.photos for modal if needed
  const modalPhotos = selectedDog?.photos?.map(photoUrl => ({ url: photoUrl, alt: `${selectedDog.name}'s photo` })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Found {dogs.length} dogs
          </h1>
        </div>

        {/* Success Message - Dismissible */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-green-900 mb-1">
                  Email alerts turned on!
                </h3>
                <p className="text-sm text-green-700">
                  We'll send you an email whenever new dogs matching your preferences become available.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-green-600 hover:text-green-800 flex-shrink-0"
              aria-label="Dismiss success message"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Above-the-fold CTA - Show only for free/signed-out users */}
        {!canViewPrefs(planInfo) && dogs.length > 0 && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              You're seeing dogs available right now
            </h2>
            <p className="text-gray-700 mb-4">
              You're seeing dogs available right now. Pro keeps watching and alerts you when the next match appears.
            </p>
            <button
              onClick={() => handleAlertsCTA('top')}
              className="btn-primary flex items-center justify-center gap-2"
            >
              Turn on alerts – $9.99/month
            </button>
          </div>
        )}

        {/* AI Matching Status Banner */}
        {matchingLoading && (
          <div className="mb-6 rounded-lg border border-blue-300 bg-blue-50 p-4 text-blue-800">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <p className="font-semibold">Generating personalized recommendations...</p>
            </div>
            <p className="text-sm mt-1">We're analyzing your preferences to find the best matches. Dogs are shown below while we work.</p>
          </div>
        )}

        {showFallbackBanner && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold">AI recommendations temporarily unavailable</p>
            <p className="text-sm">We're showing all available dogs below. Personalized matching will be back shortly.</p>
          </div>
        )}

        {/* Smart expansion hint banner when result count is low */}
        {dogs.length > 0 && dogs.length < 3 && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold mb-1">Not many results</p>
            <p className="text-sm">
              We found {dogs.length} dog{dogs.length===1?'':'s'} for your current filters. Try widening your search.
              {(() => {
                // Heuristic: suggest relaxing the most restrictive filter inferred from the query
                const suggestions: string[] = [];
                const sizes = searchQuery.size ? (Array.isArray(searchQuery.size) ? searchQuery.size : String(searchQuery.size).split(',')) : [];
                const ages = searchQuery.age ? (Array.isArray(searchQuery.age) ? searchQuery.age : String(searchQuery.age).split(',')) : [];
                const hasEnergy = !!searchQuery.energy;
                if (sizes.length === 1) suggestions.push(`add another size (e.g., ${sizes[0]==='small'?'medium or large':'another size'})`);
                if (ages.length === 1) suggestions.push(`allow more ages (e.g., add Young or Adult)`);
                if (hasEnergy) suggestions.push(`remove the energy restriction`);
                const text = suggestions.length ? ` You could ${suggestions[0]}.` : '';
                return text;
              })()}
            </p>
          </div>
        )}

        {/* Zero results banner */}
        {dogs.length === 0 && (
          <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-900">
            <p className="font-semibold mb-1">No dogs matched your filters</p>
            <p className="text-sm mb-2">
              Try broadening your search: increase the radius, add more sizes or ages, or clear the energy filter.
            </p>
            <div className="text-sm text-amber-800">
              {(() => {
                const tips: string[] = [];
                const sizes = searchQuery.size || [];
                const ages = searchQuery.age || [];
                if (sizes.length <= 1) tips.push('include more sizes');
                if (ages.length <= 1) tips.push('allow more ages');
                if (searchQuery.energy) tips.push('remove the energy restriction');
                tips.push('expand the distance');
                return `Suggestions: ${tips.join(', ')}.`;
              })()}
            </div>
            <div className="mt-3">
              <Link href="/find" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Adjust search</Link>
            </div>
          </div>
        )}

        {/* Fallback Banner */}
        {showFallbackBanner && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-amber-600 text-sm">⚠️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">No perfect hypoallergenic matches found</p>
                <p className="text-sm text-amber-700">Here are some close alternatives with important caveats.</p>
              </div>
            </div>
          </div>
        )}

        

        {/* Top Picks Section */}
        {dogs.length > 0 && topPicks.length > 0 && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Yenta matched these to your preferences</h2>
              <p className="text-gray-600">Our AI has curated these dogs for you based on your preferences.</p>
            </div>
            <div className="grid gap-y-12 gap-x-12 lg:gap-x-16 xl:gap-x-20 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center px-3 md:px-6">
              {topPicks.map((dog) => {
                // Find the analysis for this dog from matching results
                const analysis = matchingResults?.topMatches?.find(match => match.dogId === dog.id);
                return (
                  <TopPickCard 
                    key={dog.id} 
                    dog={dog} 
                    onPhotoClick={handlePhotoClick} 
                    userPreferences={userPreferences}
                    analysis={analysis}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* All Matches Section */}
        {dogs.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-6">All Matches</h3>
          <div className="grid gap-y-10 gap-x-10 md:gap-x-12 xl:gap-x-16 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center">
            {dogs.map((dog) => {
              // Find the analysis for this dog from matching results
              const analysis = matchingResults?.allMatches?.find(match => match.dogId === dog.id);
              return (
                <DogCard 
                  key={dog.id}
                  dog={dog}
                  onPhotoClick={handlePhotoClick}
                  userPreferences={userPreferences}
                  analysis={analysis}
                />
              );
            })}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const endPage = Math.min(totalPages, currentPage + 4);
                  return Math.max(currentPage, Math.max(1, endPage - 4)) + i;
                }).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedDog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedDog.name}</h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <PhotoCarousel
                photos={modalPhotos}
                dogName={selectedDog.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  );
}
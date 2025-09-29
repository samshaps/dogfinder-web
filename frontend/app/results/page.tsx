'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Share2, ExternalLink, MapPin, Home, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { listDogs, type Dog } from '@/lib/api';
import { generateTopPickReasoning, generateAllMatchReasoning, type AIReasoning } from '@/lib/ai-service';
import { buildAnalysis, selectTopPicks, type Analysis, type UserPreferences } from '@/utils/matching';
import { dedupeChips, removeContradictions, improveConcernPhrasing, improveMatchPhrasing } from '@/utils/text';
import PhotoCarousel from '@/components/PhotoCarousel';
import PreferencesSummary from '@/components/PreferencesSummary';

function TopPickCard({ dog, onPhotoClick, userPreferences, analysis }: { dog: Dog; onPhotoClick: (dog: Dog) => void; userPreferences?: UserPreferences; analysis?: Analysis }) {
  const [showCopied, setShowCopied] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<AIReasoning | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  
  // Load AI reasoning when component mounts
  useEffect(() => {
    async function loadAIReasoning() {
      try {
        console.log('🤖 Loading AI reasoning for Top Pick:', dog.name);
        console.log('📝 User preferences:', userPreferences);
        console.log('🐕 Dog data:', { name: dog.name, breeds: dog.breeds, size: dog.size, age: dog.age, tags: dog.tags });
        console.log('🎯 Analysis:', analysis);
        setIsLoadingAI(true);
        const reasoning = await generateTopPickReasoning(dog, userPreferences || {}, analysis || buildAnalysis(dog, userPreferences || {}));
        console.log('✅ AI reasoning loaded:', reasoning);
        setAiReasoning(reasoning);
      } catch (error) {
        console.error('❌ Failed to load AI reasoning, using fallback:', error);
        // Fallback to basic reasoning
        setAiReasoning({
          primary: "Great potential as a loving companion",
          additional: [],
          concerns: []
        });
      } finally {
        setIsLoadingAI(false);
      }
    }
    
    loadAIReasoning();
  }, [dog, userPreferences, analysis]);
  
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(dog.url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  // Convert dog.photos (string[]) to Photo[] format
  const photos = dog.photos?.map(photoUrl => ({ url: photoUrl, alt: `${dog.name}'s photo` })) || [];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="relative">
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
      </div>
      
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900">{dog.name}</h3>
          <p className="text-sm text-gray-600">{dog.breeds.join(', ')}</p>
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
              <p className="text-sm font-medium text-blue-900 mb-1">Why this dog is perfect for you:</p>
              {isLoadingAI ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-blue-200 rounded w-1/2"></div>
                </div>
              ) : aiReasoning ? (
                <>
                  {(() => {
                    // Compose one smooth sentence from the start: no em-dashes; use commas and "and"
                    const humanJoin = (arr: string[]) => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
                    const toClause = (label: string) => {
                      const mSize = label.match(/\b(Small|Medium|Large|XL|Extra Large)\b/i);
                      if (mSize) return `${mSize[0]} size fits your needs`;
                      const mAge = label.match(/\b(Baby|Young|Adult|Senior)\b/i);
                      if (mAge) return `${mAge[0]} age matches your preference`;
                      const mEnergy = label.match(/Energy level matches \((low|medium|high)\)/i);
                      if (mEnergy) return `${mEnergy[1]} energy`;
                      if (/hypoallergenic/i.test(label)) return 'hypoallergenic temperament';
                      return improveMatchPhrasing(label);
                    };

                    // Gather candidate clauses from matched preferences
                    const traitClauses: string[] = [];
                    if (analysis && analysis.matchedPrefs.length > 0) {
                      const { matches } = removeContradictions(
                        analysis.matchedPrefs.map(p => p.label),
                        [...analysis.unmetPrefs.map(p => p.label), ...analysis.mismatches]
                      );
                      const unique = dedupeChips(matches).map(toClause).filter(Boolean);
                      traitClauses.push(...unique);
                    }

                    // Additional AI phrases can be appended as natural short clauses
                    const extra = (aiReasoning.additional || []).filter(Boolean).map(s => s.replace(/\.+\s*$/, ''));

                    // If AI provided a primary, weave clauses around it; otherwise synthesize from traits
                    let primary = (aiReasoning.primary || '').replace(/\.+\s*$/, '');
                    const canon = primary.toLowerCase();
                    const filteredTraits = traitClauses.filter(c => {
                      const lc = c.toLowerCase();
                      return !(
                        (/(baby|young|adult|senior) age/.test(lc) && /(baby|young|adult|senior)\b/.test(canon)) ||
                        (/size fits your needs/.test(lc) && /(small|medium|large|xl|extra\s+large)\b/.test(canon)) ||
                        (/energy/.test(lc) && /energy/.test(canon)) ||
                        (/hypoallergenic/.test(lc) && /hypoallergenic/.test(canon))
                      );
                    });

                    // Limit to at most 2 supporting clauses for readability
                    const support = humanJoin([...filteredTraits.slice(0, 2), ...extra.slice(0, 1)]);
                    let sentence: string;
                    if (primary) {
                      sentence = support ? `${primary}, ${support}.` : `${primary}.`;
                    } else if (support) {
                      sentence = `${support.charAt(0).toUpperCase()}${support.slice(1)}.`;
                    } else {
                      sentence = 'A promising match based on your preferences.';
                    }
                    return <p className="text-sm text-blue-800 mb-2">{sentence}</p>;
                  })()}
                  {/* Concerns removed from AI card */}
                </>
              ) : (
                <p className="text-sm text-blue-800">Great potential as a loving companion</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Location */}
        <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{dog.location.city}, {dog.location.state}</span>
        </div>
        
        {/* Location and Distance */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <ExternalLink className="w-4 h-4" />
          <span>{dog.shelter.name}</span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <a
            href={dog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700 transition-colors font-medium"
          >
            View on Petfinder
          </a>
          <button
            onClick={handleShare}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {showCopied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DogCard({ dog, onPhotoClick, userPreferences, analysis }: { dog: Dog; onPhotoClick: (dog: Dog) => void; userPreferences?: UserPreferences; analysis?: Analysis }) {
  const [showCopied, setShowCopied] = useState(false);
  const [shortAIReasoning, setShortAIReasoning] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  
  // Load AI reasoning when component mounts
  useEffect(() => {
    async function loadAIReasoning() {
      try {
        console.log('🤖 Loading AI reasoning for All Match:', dog.name);
        console.log('📝 User preferences:', userPreferences);
        console.log('🎯 Analysis:', analysis);
        setIsLoadingAI(true);
        const reasoning = await generateAllMatchReasoning(dog, userPreferences || {}, analysis || buildAnalysis(dog, userPreferences || {}));
        console.log('✅ AI reasoning loaded:', reasoning);
        setShortAIReasoning(reasoning);
      } catch (error) {
        console.error('❌ Failed to load AI reasoning, using fallback:', error);
        // Fallback to basic reasoning
        setShortAIReasoning('Great companion');
      } finally {
        setIsLoadingAI(false);
      }
    }
    
    loadAIReasoning();
  }, [dog, userPreferences, analysis]);
  
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(dog.url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  // Convert dog.photos (string[]) to Photo[] format
  const photos = dog.photos?.map(photoUrl => ({ url: photoUrl, alt: `${dog.name}'s photo` })) || [];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
      
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-lg">{dog.name}</h3>
          <p className="text-sm text-gray-600">{dog.breeds.join(', ')}</p>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="text-sm text-gray-600">
            {dog.age} • {dog.size}
          </div>
          
          {/* Matches chips removed for simplified UI */}

          {/* Things to consider */}
          {analysis && (analysis.unmetPrefs.length > 0 || analysis.mismatches.length > 0) && (
            <div className="mb-2">
              <p className="text-xs font-medium text-amber-800 mb-1">⚠️ Consider:</p>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const allConcerns = [...analysis.unmetPrefs.map(p => p.label), ...analysis.mismatches];
                  return dedupeChips(allConcerns).slice(0, 1).map((concern, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800">
                      {improveConcernPhrasing(concern)}
                    </span>
                  ));
                })()}
              </div>
            </div>
          )}
          
          {/* Removed tag bubbles for cleaner UI */}
        </div>
        
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-600">
            {dog.location.city}, {dog.location.state}
          </span>
          <span className="text-xs text-gray-400">({Math.round(dog.location.distanceMi)} miles)</span>
        </div>
        
        <div className="flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          <span className="text-xs text-gray-600">{dog.shelter.name}</span>
        </div>
        
        {/* AI Note - Short Dynamic */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            <Home className="w-3 h-3" />
            {isLoadingAI ? (
              <div className="animate-pulse bg-blue-200 h-3 w-16 rounded"></div>
            ) : (
              shortAIReasoning || 'Great companion'
            )}
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          <a
            href={dog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-center hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            View on Petfinder
          </a>
          <button
            onClick={handleShare}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [topPicks, setTopPicks] = useState<Dog[]>([]);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('freshness');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  
  // Extract search parameters
  const searchQuery = useMemo(() => ({
    zip: searchParams.get('zip') || '',
    radius: parseInt(searchParams.get('radius') || '50'),
    age: searchParams.get('age')?.split(',') || [],
    size: searchParams.get('size')?.split(',') || [],
    includeBreeds: searchParams.get('includeBreeds')?.split(',') || [],
    excludeBreeds: searchParams.get('excludeBreeds')?.split(',') || [],
    temperament: searchParams.get('temperament')?.split(',') || [],
    energy: searchParams.get('energy') || '',
    guidance: searchParams.get('guidance') || '',  // ADD GUIDANCE EXTRACTION
    page: currentPage,
    limit: 12
  }), [searchParams, currentPage]);

  // Extract user preferences for AI reasoning  
  const userPreferences: UserPreferences = {
    age: searchQuery.age,
    size: searchQuery.size,
    includeBreeds: searchQuery.includeBreeds,
    excludeBreeds: searchQuery.excludeBreeds,  // ADD MISSING EXCLUDEBREEDS
    temperament: searchQuery.temperament,
    energy: searchQuery.energy,
    guidance: searchQuery.guidance  // ADD GUIDANCE TO USER PREFERENCES
  };
  
  // DEBUG TRACE GUIDANCE
  console.log('🔍 RESULTS PAGE DEBUG: searchQuery extracted:', {
    guidance: searchQuery.guidance,
    age: searchQuery.age,
    size: searchQuery.size,
    temperament: searchQuery.temperament,
    excludeBreeds: searchQuery.excludeBreeds
  });
  console.log('🔍 RESULTS PAGE DEBUG: userPreferences for AI:', userPreferences);
  
  // Filter dogs to only include those with photos
  const filterDogsWithPhotos = (dogs: Dog[]) => {
    return dogs.filter(dog => dog.photos && dog.photos.length > 0);
  };

  // Modal handlers
  const handlePhotoClick = (dog: Dog) => {
    setSelectedDog(dog);
  };

  const handleCloseModal = () => {
    setSelectedDog(null);
  };

  // Create a fingerprint for de-duplication (frontend safety net)
  const createDogFingerprint = (dog: Dog): string => {
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
        
        // Use AI to select top picks based on user preferences
        console.log('🎯 AI TOP PICKS: Starting AI-based selection...');
        const { dogs: aiTopPicks, showFallbackBanner: showBanner } = await selectTopPicks(dogsWithPhotos, userPreferences, 3);
        setTopPicks(aiTopPicks);
        setShowFallbackBanner(showBanner);
        
      } catch (err) {
        console.error('Error fetching dogs:', err);
        setError('Failed to load dogs. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDogs();
  }, [searchQuery, currentPage, sortBy]);

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
      {/* Header with navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-2xl font-bold text-blue-600">
                  DogYenta
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Found {dogs.length} dogs
          </h1>
          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="freshness">Freshness</option>
              <option value="distance">Distance</option>
              <option value="age">Age</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topPicks.map((dog) => {
                const analysis = buildAnalysis(dog, userPreferences);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dogs.map((dog) => {
              const analysis = buildAnalysis(dog, userPreferences);
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
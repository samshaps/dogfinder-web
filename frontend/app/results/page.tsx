'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Share2, ExternalLink, MapPin, Home, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { listDogs, type Dog } from '@/lib/api';
import { generateTopPickReasoning, generateAllMatchReasoning, type AIReasoning } from '@/lib/ai-service';
import PhotoCarousel from '@/components/PhotoCarousel';

function TopPickCard({ dog, onPhotoClick, userPreferences }: { dog: Dog; onPhotoClick: (dog: Dog) => void; userPreferences?: Record<string, unknown> }) {
  const [showCopied, setShowCopied] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<AIReasoning | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  
  // Load AI reasoning when component mounts
  useEffect(() => {
    async function loadAIReasoning() {
      try {
        console.log('🤖 Loading AI reasoning for Top Pick:', dog.name);
        console.log('📝 User preferences:', userPreferences); // Add debug for guidance
        setIsLoadingAI(true);
        const reasoning = await generateTopPickReasoning(dog, userPreferences || {});
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
  }, [dog, userPreferences]);
  
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
                  <p className="text-sm text-blue-800 mb-2">{aiReasoning.primary}</p>
                  {aiReasoning.additional.length > 0 && (
                    <div className="space-y-1">
                      {aiReasoning.additional.map((reason, index) => (
                        <p key={index} className="text-xs text-blue-700">• {reason}</p>
                      ))}
                    </div>
                  )}
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

function DogCard({ dog, onPhotoClick, userPreferences }: { dog: Dog; onPhotoClick: (dog: Dog) => void; userPreferences?: Record<string, unknown> }) {
  const [showCopied, setShowCopied] = useState(false);
  const [shortAIReasoning, setShortAIReasoning] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  
  // Load AI reasoning when component mounts
  useEffect(() => {
    async function loadAIReasoning() {
      try {
        console.log('🤖 Loading AI reasoning for All Match:', dog.name);
        console.log('📝 User preferences:', userPreferences); // Add debug for guidance
        setIsLoadingAI(true);
        const reasoning = await generateAllMatchReasoning(dog, userPreferences || {});
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
  }, [dog, userPreferences]);
  
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
          
          <div className="flex justify-between text-sm text-gray-600">
            {dog.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            {dog.tags.slice(2, 4).map((tag, index) => (
              <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                {tag}
              </span>
            ))}
          </div>
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
  const userPreferences = {
    age: searchQuery.age,
    size: searchQuery.size,
    includeBreeds: searchQuery.includeBreeds,
    temperament: searchQuery.temperament,
    energy: searchQuery.energy,
    guidance: searchQuery.guidance  // ADD GUIDANCE TO USER PREFERENCES
  };
  
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
        
        // For now, simulate top picks by taking first 3 dogs with photos
        // In a real app, this would come from AI ranking
        setTopPicks(dogsWithPhotos.slice(0, 3));
        
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
        <div className="flex justify-between items-center mb-8">
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

        {/* Top Picks Section */}
        {topPicks.length > 0 && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Yenta says… meet your matches!</h2>
              <p className="text-gray-600">Our AI has curated these dogs for you based on your preferences.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topPicks.map((dog) => (
                <TopPickCard key={dog.id} dog={dog} onPhotoClick={handlePhotoClick} userPreferences={userPreferences} />
              ))}
            </div>
          </div>
        )}

        {/* All Matches Section */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-6">All Matches</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dogs.map((dog) => (
              <DogCard key={dog.id} dog={dog} onPhotoClick={handlePhotoClick} userPreferences={userPreferences} />
            ))}
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
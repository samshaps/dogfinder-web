'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Share2, ExternalLink, MapPin, AlertTriangle, Home, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { listDogs, type Dog } from '@/lib/api';
import { generateTopPickReasoning, generateAllMatchReasoning, type AIReasoning } from '@/lib/ai-service';
import PhotoCarousel from '@/components/PhotoCarousel';

// AI Reasoning Generator - Creates contextual recommendations based on dog data
function generateAIReasoning(dog: Dog, userPreferences: any = {}) {
  const reasons = [];
  const concerns = [];
  
  // Analyze breed characteristics with concise variety (150 chars max for top picks, 50 for all)
  const breeds = dog.breeds.join(', ').toLowerCase();
  const breedReasons = {
    'golden retriever': [
      "Gentle & patient - perfect for families with children",
      "Highly trainable - ideal for first-time dog owners",
      "Friendly nature makes them excellent therapy dogs"
    ],
    'labrador': [
      "Versatile companion - great for active families",
      "Water-loving - perfect for beach adventures",
      "Loyal & protective while remaining gentle"
    ],
    'border collie': [
      "Einstein of dogs - perfect for mental challenges",
      "Herding instincts keep family together",
      "Ideal for active owners who love outdoor adventures"
    ],
    'australian shepherd': [
      "Incredibly intelligent - excel at learning tricks",
      "Protective nature makes excellent watchdogs",
      "Perfect for agility training enthusiasts"
    ],
    'poodle': [
      "Hypoallergenic - perfect for allergy concerns",
      "Intelligent & trainable for advanced training",
      "Elegant appearance with graceful movement"
    ],
    'beagle': [
      "Incredible sense of smell - adventure companions",
      "Pack mentality - loves being part of family",
      "Musical howling - unique voice appreciated"
    ],
    'mixed': [
      "Hybrid vigor - best traits of multiple breeds",
      "Unique appearance - one-of-a-kind companion",
      "More adaptable & healthier than purebreds"
    ]
  };
  
  // Find matching breed reasons
  for (const [breed, breedReasonList] of Object.entries(breedReasons)) {
    if (breeds.includes(breed)) {
      const randomReason = breedReasonList[Math.floor(Math.random() * breedReasonList.length)];
      reasons.push(randomReason);
      break;
    }
  }
  
  // Analyze age with concise variety
  const age = dog.age.toLowerCase();
  const ageReasons = {
    'puppy': [
      "Puppy energy - endless entertainment & growth",
      "Young age - shape personality & habits early",
      "Perfect for families wanting full dog journey"
    ],
    'baby': [
      "Blank canvas - mold into perfect companion",
      "Small size - easy to manage while learning",
      "Ideal for owners wanting every development stage"
    ],
    'young': [
      "Energy to burn - perfect for active owners",
      "Playful nature keeps you entertained",
      "Great age for training & routine building"
    ],
    'adult': [
      "Pre-trained with established personality",
      "Past destructive puppy phase",
      "Companion without puppyhood challenges"
    ],
    'senior': [
      "Calmer - excellent for quieter lifestyles",
      "Wisdom & experience - incredibly loyal",
      "Perfect for providing loving golden years"
    ]
  };
  
  for (const [ageGroup, ageReasonList] of Object.entries(ageReasons)) {
    if (age.includes(ageGroup)) {
      const randomReason = ageReasonList[Math.floor(Math.random() * ageReasonList.length)];
      reasons.push(randomReason);
      break;
    }
  }
  
  // Analyze size with concise lifestyle context
  const size = dog.size.toLowerCase();
  const sizeReasons = {
    'small': [
      "Perfect for apartments & easy travel",
      "Compact size - lower costs & easier grooming",
      "Can accompany you anywhere"
    ],
    'medium': [
      "Perfect balance of companionship & manageability",
      "True companion, easy to handle",
      "Play with kids without overwhelming them"
    ],
    'large': [
      "Keep up with active outdoor adventures",
      "Presence provides security & protection",
      "Gentle giant & active partner"
    ],
    'xl': [
      "Excellent hiking & outdoor companions",
      "Size commands respect, gentle nature wins hearts",
      "Matches most active lifestyles"
    ]
  };
  
  for (const [sizeGroup, sizeReasonList] of Object.entries(sizeReasons)) {
    if (size.includes(sizeGroup)) {
      const randomReason = sizeReasonList[Math.floor(Math.random() * sizeReasonList.length)];
      reasons.push(randomReason);
      break;
    }
  }
  
  // Analyze tags and temperament with concise variety
  const tags = dog.tags.map(tag => tag.toLowerCase()).join(' ');
  const tagReasons = {
    'affectionate': [
      "Highly affectionate - never feel alone",
      "Cuddly personality - perfect for physical affection",
      "Emotional intelligence - senses when you need comfort"
    ],
    'good with kids': [
      "Excellent with children - kids' best friend",
      "Patient nature - perfect for young families",
      "Gentle play style & protective instincts"
    ],
    'playful': [
      "Playful nature - endless entertainment",
      "Energy keeps you active & engaged",
      "Perfect for games, toys & interactive play"
    ],
    'calm': [
      "Calm demeanor - ideal for quiet households",
      "Peaceful nature - relaxing atmosphere",
      "Perfect for laid-back companion seekers"
    ],
    'house trained': [
      "Already house-trained - one less worry",
      "Good habits - focus on bonding not training",
      "Well-behaved companion from day one"
    ],
    'good with dogs': [
      "Gets along with other dogs - multi-pet friendly",
      "Social nature - makes friends at dog park",
      "Plays well with others"
    ],
    'intelligent': [
      "High intelligence - quick learner",
      "Smart nature - excellent problem-solver",
      "Perfect for mental challenges & training"
    ]
  };
  
  // Add tag-based reasons
  for (const [tag, tagReasonList] of Object.entries(tagReasons)) {
    if (tags.includes(tag)) {
      const randomReason = tagReasonList[Math.floor(Math.random() * tagReasonList.length)];
      reasons.push(randomReason);
    }
  }
  
  // Generate concise contextual concerns
  const concernReasons = {
    'high energy': [
      "High energy - needs daily exercise & stimulation",
      "Active nature - needs owner who matches energy",
      "Consider time & space for exercise needs"
    ],
    'grooming': [
      "Regular grooming needs - time & cost consideration",
      "Coat maintenance - keep looking & feeling best",
      "Factor in grooming expenses"
    ],
    'separation anxiety': [
      "May have separation anxiety - not ideal for long work hours",
      "Prefers not to be left alone for extended periods",
      "Consider work schedule & ability to provide companionship"
    ],
    'stubborn': [
      "Independent streak - needs extra training patience",
      "Strong will - needs experienced, firm but fair owner",
      "Consider if you have experience for their personality"
    ]
  };
  
  for (const [concern, concernReasonList] of Object.entries(concernReasons)) {
    if (tags.includes(concern)) {
      const randomConcern = concernReasonList[Math.floor(Math.random() * concernReasonList.length)];
      concerns.push(randomConcern);
    }
  }
  
  // Create personalized recommendation with character limits
  const primaryReason = reasons[0] || "Great potential as loving companion";
  const additionalReasons = reasons.slice(1, 3); // Take up to 2 additional reasons
  
  // Ensure primary reason is under 150 characters for top picks
  const truncatedPrimary = primaryReason.length > 150 
    ? primaryReason.substring(0, 147) + "..." 
    : primaryReason;
  
  // Truncate additional reasons to fit in top picks (should be under 150 total)
  const truncatedAdditional = additionalReasons.map(reason => 
    reason.length > 50 ? reason.substring(0, 47) + "..." : reason
  );
  
  return {
    primary: truncatedPrimary,
    additional: truncatedAdditional,
    concerns: concerns
  };
}

// Short AI reasoning for All Matches section (50 characters max)
function generateShortAIReasoning(dog: Dog) {
  const reasons = [];
  
  // Breed-based short reasons
  const breeds = dog.breeds.join(', ').toLowerCase();
  if (breeds.includes('golden retriever')) reasons.push("Gentle family dog");
  else if (breeds.includes('labrador')) reasons.push("Versatile companion");
  else if (breeds.includes('border collie')) reasons.push("Smart & energetic");
  else if (breeds.includes('poodle')) reasons.push("Hypoallergenic & smart");
  else if (breeds.includes('beagle')) reasons.push("Adventure companion");
  else if (breeds.includes('mixed')) reasons.push("Hybrid vigor");
  
  // Age-based short reasons
  const age = dog.age.toLowerCase();
  if (age.includes('puppy') || age.includes('baby')) reasons.push("Young & trainable");
  else if (age.includes('adult')) reasons.push("Pre-trained adult");
  else if (age.includes('senior')) reasons.push("Calm senior");
  
  // Size-based short reasons
  const size = dog.size.toLowerCase();
  if (size.includes('small')) reasons.push("Apartment friendly");
  else if (size.includes('large') || size.includes('xl')) reasons.push("Active companion");
  
  // Tag-based short reasons
  const tags = dog.tags.map(tag => tag.toLowerCase()).join(' ');
  if (tags.includes('affectionate')) reasons.push("Very loving");
  if (tags.includes('good with kids')) reasons.push("Kid-friendly");
  if (tags.includes('playful')) reasons.push("Fun & energetic");
  if (tags.includes('calm')) reasons.push("Peaceful nature");
  if (tags.includes('house trained')) reasons.push("Already trained");
  if (tags.includes('intelligent')) reasons.push("Quick learner");
  
  // Return the first reason, truncated to 50 characters
  const primaryReason = reasons[0] || "Great companion";
  return primaryReason.length > 50 
    ? primaryReason.substring(0, 47) + "..." 
    : primaryReason;
}

// Photo Carousel Modal Component
function PhotoModal({ dog, isOpen, onClose }: { dog: Dog | null; isOpen: boolean; onClose: () => void }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  if (!isOpen || !dog) return null;
  
  const photos = dog.photos || [];
  const hasMultiplePhotos = photos.length > 1;
  
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };
  
  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{dog.name} - Photo Gallery</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Photo Display */}
        <div className="relative">
          <img
            src={photos[currentPhotoIndex] || '/placeholder-dog.jpg'}
            alt={`${dog.name} photo ${currentPhotoIndex + 1}`}
            className="w-full h-96 object-cover"
          />
          
          {/* Navigation Arrows */}
          {hasMultiplePhotos && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
        
        {/* Photo Counter */}
        {hasMultiplePhotos && (
          <div className="p-4 text-center text-sm text-gray-600">
            Photo {currentPhotoIndex + 1} of {photos.length}
          </div>
        )}
        
        {/* Actions */}
        <div className="p-4 border-t flex gap-3">
          <a
            href={dog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            View on Petfinder
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(dog.url);
              // You could add a toast notification here
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

// Dog Card Component for Top Picks
function TopPickCard({ dog, onPhotoClick, userPreferences }: { dog: Dog; onPhotoClick: (dog: Dog) => void; userPreferences?: any }) {
  const [showCopied, setShowCopied] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<AIReasoning | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  
  // Load AI reasoning when component mounts
  useEffect(() => {
    async function loadAIReasoning() {
      try {
        console.log('🤖 Loading AI reasoning for Top Pick:', dog.name);
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
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
      {/* Photo Carousel */}
      <PhotoCarousel
        photos={dog.photos.map(url => ({ url, alt: `${dog.name} the ${dog.breeds.join(', ')}` }))}
        dogName={dog.name}
        className="hover:scale-105 transition-transform"
      />
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Name & Breed */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{dog.name}</h3>
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
        
        {/* Dynamic Concerns */}
        {aiReasoning && aiReasoning.concerns.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Consider this:</p>
                {aiReasoning.concerns.map((concern, index) => (
                  <p key={index} className="text-sm text-yellow-800">• {concern}</p>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Shelter & Location */}
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{dog.shelter.name}, {dog.location.city}, {dog.location.state}</span>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <a
            href={dog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            View on Petfinder
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={handleShare}
            className="relative px-4 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
            {showCopied && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                Copied!
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Standard Dog Card Component
function DogCard({ dog, onPhotoClick, userPreferences }: { dog: Dog; onPhotoClick: (dog: Dog) => void; userPreferences?: any }) {
  const [showCopied, setShowCopied] = useState(false);
  const [shortAIReasoning, setShortAIReasoning] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  
  // Load AI reasoning when component mounts
  useEffect(() => {
    async function loadAIReasoning() {
      try {
        console.log('🤖 Loading AI reasoning for All Match:', dog.name);
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
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Photo Carousel */}
      <PhotoCarousel
        photos={dog.photos.map(url => ({ url, alt: `${dog.name} the ${dog.breeds.join(', ')}` }))}
        dogName={dog.name}
        className="hover:scale-105 transition-transform"
      />
      
      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Name & Breed */}
        <div>
          <h3 className="font-semibold text-gray-900">{dog.name}</h3>
          <p className="text-sm text-gray-600">{dog.breeds.join(', ')}</p>
        </div>
        
        {/* Shelter & Location */}
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <MapPin className="w-3 h-3" />
          <span>{dog.shelter.name}, {dog.location.city}</span>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {dog.size}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {dog.age}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {dog.tags[0] || 'Friendly'}
          </span>
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
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <a
            href={dog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center"
          >
            View Details
          </a>
          <button
            onClick={handleShare}
            className="relative px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
            {showCopied && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                Copied!
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sort Controls Component
function SortControls({ sortBy, onSortChange }: { sortBy: string; onSortChange: (sort: string) => void }) {
  const sortOptions = [
    { value: 'freshness', label: 'Freshness' },
    { value: 'distance', label: 'Distance' },
    { value: 'age', label: 'Age' },
    { value: 'size', label: 'Size' }
  ];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Sort by:</span>
      <div className="flex gap-1">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              sortBy === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) {
  const pages = [];
  const maxVisible = 5;
  
  // Calculate page range
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &lt;
      </button>
      
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            1
          </button>
          {startPage > 2 && <span className="px-2 text-gray-400">...</span>}
        </>
      )}
      
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {page}
        </button>
      ))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2 text-gray-400">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &gt;
      </button>
    </div>
  );
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [topPicks, setTopPicks] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('freshness');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Extract search parameters
  const searchQuery = {
    zip: searchParams.get('zip') || '',
    radius: parseInt(searchParams.get('radius') || '50'),
    age: searchParams.get('age')?.split(',') || [],
    size: searchParams.get('size')?.split(',') || [],
    includeBreeds: searchParams.get('includeBreeds')?.split(',') || [],
    excludeBreeds: searchParams.get('excludeBreeds')?.split(',') || [],
    temperament: searchParams.get('temperament')?.split(',') || [],
    energy: searchParams.get('energy') || '',
    page: currentPage,
    limit: 12
  };

  // Extract user preferences for AI reasoning
  const userPreferences = {
    age: searchQuery.age,
    size: searchQuery.size,
    includeBreeds: searchQuery.includeBreeds,
    temperament: searchQuery.temperament,
    energy: searchQuery.energy
  };
  
  // Filter dogs to only include those with photos
  const filterDogsWithPhotos = (dogs: Dog[]) => {
    return dogs.filter(dog => dog.photos && dog.photos.length > 0);
  };

  // Modal handlers
  const handlePhotoClick = (dog: Dog) => {
    setSelectedDog(dog);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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
            console.log('🔄 Filtering duplicate dog:', dog.name, dog.breeds.join(', '));
            return false; // Skip duplicate
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
        setError(err instanceof Error ? err.message : 'Failed to fetch dogs');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDogs();
  }, [searchParams, currentPage, sortBy]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-4">
                  <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium mb-4">Something went wrong</div>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (dogs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-medium mb-4">No dogs found</div>
            <p className="text-gray-500 mb-6">
              Try expanding your search radius or adjusting your preferences.
            </p>
            <a
              href="/find"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Adjust Search
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
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
                <a className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium" href="/find">Find a Dog</a>
                <a className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium" href="/about">About</a>
                <a className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium" href="/contact">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">All Matches</h2>
            <SortControls sortBy={sortBy} onSortChange={setSortBy} />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dogs.map((dog) => (
              <DogCard key={dog.id} dog={dog} onPhotoClick={handlePhotoClick} userPreferences={userPreferences} />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal 
        dog={selectedDog} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </div>
  );
}

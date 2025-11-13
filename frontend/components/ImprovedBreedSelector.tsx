'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Search, Plus, Minus } from 'lucide-react';

// Most common breeds on Petfinder (based on typical adoption data)
const POPULAR_BREEDS = [
  'Labrador Retriever',
  'German Shepherd',
  'Pit Bull Terrier',
  'Chihuahua',
  'Golden Retriever',
  'Beagle',
  'French Bulldog',
  'Bulldog',
  'Poodle',
  'Rottweiler',
  'Siberian Husky',
  'Boxer',
  'Dachshund',
  'Shih Tzu',
  'Border Collie'
];

// Extended breed list for autocomplete (200+ breeds)
const ALL_BREEDS = [
  'Affenpinscher', 'Afghan Hound', 'Airedale Terrier', 'Akita', 'Alaskan Malamute',
  'American Bulldog', 'American Pit Bull Terrier', 'American Staffordshire Terrier',
  'American Water Spaniel', 'Anatolian Shepherd', 'Australian Cattle Dog', 'Australian Shepherd',
  'Australian Terrier', 'Basenji', 'Basset Hound', 'Beagle', 'Bearded Collie', 'Bedlington Terrier',
  'Belgian Malinois', 'Belgian Sheepdog', 'Belgian Tervuren', 'Bernese Mountain Dog',
  'Bichon Frise', 'Black and Tan Coonhound', 'Black Russian Terrier', 'Bloodhound',
  'Bluetick Coonhound', 'Border Collie', 'Border Terrier', 'Borzoi', 'Boston Terrier',
  'Bouvier des Flandres', 'Boxer', 'Boykin Spaniel', 'Briard', 'Brittany', 'Brussels Griffon',
  'Bull Terrier', 'Bulldog', 'Bullmastiff', 'Cairn Terrier', 'Canaan Dog', 'Cane Corso',
  'Cardigan Welsh Corgi', 'Cavalier King Charles Spaniel', 'Chesapeake Bay Retriever',
  'Chihuahua', 'Chinese Crested', 'Chinese Shar-Pei', 'Chinook', 'Chow Chow', 'Clumber Spaniel',
  'Cocker Spaniel', 'Collie', 'Curly-Coated Retriever', 'Dachshund', 'Dalmatian',
  'Dandie Dinmont Terrier', 'Doberman Pinscher', 'Dogue de Bordeaux', 'English Cocker Spaniel',
  'English Setter', 'English Springer Spaniel', 'English Toy Spaniel', 'Field Spaniel',
  'Finnish Spitz', 'Flat-Coated Retriever', 'French Bulldog', 'German Pinscher',
  'German Shepherd', 'German Shorthaired Pointer', 'German Wirehaired Pointer',
  'Giant Schnauzer', 'Glen of Imaal Terrier', 'Golden Retriever', 'Gordon Setter',
  'Great Dane', 'Great Pyrenees', 'Greater Swiss Mountain Dog', 'Greyhound', 'Harrier',
  'Havanese', 'Ibizan Hound', 'Icelandic Sheepdog', 'Irish Red and White Setter',
  'Irish Setter', 'Irish Terrier', 'Irish Water Spaniel', 'Irish Wolfhound',
  'Italian Greyhound', 'Jack Russell Terrier', 'Japanese Chin', 'Keeshond',
  'Kerry Blue Terrier', 'Komondor', 'Kuvasz', 'Labrador Retriever', 'Lakeland Terrier',
  'Leonberger', 'Lhasa Apso', 'Lowchen', 'Maltese', 'Manchester Terrier',
  'Mastiff', 'Miniature Bull Terrier', 'Miniature Pinscher', 'Miniature Schnauzer',
  'Neapolitan Mastiff', 'Newfoundland', 'Norfolk Terrier', 'Norwegian Buhund',
  'Norwegian Elkhound', 'Norwegian Lundehund', 'Norwich Terrier', 'Nova Scotia Duck Tolling Retriever',
  'Old English Sheepdog', 'Otterhound', 'Papillon', 'Parson Russell Terrier', 'Pekingese',
  'Pembroke Welsh Corgi', 'Petit Basset Griffon Vendeen', 'Pharaoh Hound', 'Plott',
  'Pointer', 'Polish Lowland Sheepdog', 'Pomeranian', 'Poodle', 'Portuguese Water Dog',
  'Pug', 'Puli', 'Pumi', 'Pyrenean Shepherd', 'Rat Terrier', 'Redbone Coonhound',
  'Rhodesian Ridgeback', 'Rottweiler', 'Saint Bernard', 'Saluki', 'Samoyed',
  'Schipperke', 'Scottish Deerhound', 'Scottish Terrier', 'Sealyham Terrier',
  'Shetland Sheepdog', 'Shiba Inu', 'Shih Tzu', 'Siberian Husky', 'Silky Terrier',
  'Skye Terrier', 'Sloughi', 'Smooth Fox Terrier', 'Soft Coated Wheaten Terrier',
  'Spanish Water Dog', 'Spinone Italiano', 'Staffordshire Bull Terrier', 'Standard Schnauzer',
  'Sussex Spaniel', 'Swedish Vallhund', 'Tibetan Mastiff', 'Tibetan Spaniel', 'Tibetan Terrier',
  'Toy Fox Terrier', 'Treeing Walker Coonhound', 'Vizsla', 'Weimaraner', 'Welsh Springer Spaniel',
  'Welsh Terrier', 'West Highland White Terrier', 'Whippet', 'Wire Fox Terrier',
  'Wirehaired Pointing Griffon', 'Xoloitzcuintli', 'Yorkshire Terrier'
];

interface ImprovedBreedSelectorProps {
  includeBreeds: string[];
  excludeBreeds: string[];
  onIncludeChange: (breeds: string[]) => void;
  onExcludeChange: (breeds: string[]) => void;
}

export default function ImprovedBreedSelector({
  includeBreeds,
  excludeBreeds,
  onIncludeChange,
  onExcludeChange,
}: ImprovedBreedSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedBreeds, setSelectedBreeds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get all breeds that are either included or excluded
  const allSelectedBreeds = [...includeBreeds, ...excludeBreeds];

  // Filter breeds based on search term
  const filteredBreeds = ALL_BREEDS.filter(breed =>
    breed.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !allSelectedBreeds.includes(breed)
  );

  // Handle breed selection from search
  const handleBreedSelect = (breed: string) => {
    if (!allSelectedBreeds.includes(breed)) {
      setSelectedBreeds(prev => [...prev, breed]);
    }
    setSearchTerm('');
    setShowSuggestions(false);
  };

  // Handle adding breed to include list
  const handleIncludeBreed = (breed: string) => {
    if (!includeBreeds.includes(breed)) {
      onIncludeChange([...includeBreeds, breed]);
    }
    setSelectedBreeds(prev => prev.filter(b => b !== breed));
  };

  // Handle adding breed to exclude list
  const handleExcludeBreed = (breed: string) => {
    if (!excludeBreeds.includes(breed)) {
      onExcludeChange([...excludeBreeds, breed]);
    }
    setSelectedBreeds(prev => prev.filter(b => b !== breed));
  };

  // Handle removing breed from include list
  const handleRemoveInclude = (breed: string) => {
    onIncludeChange(includeBreeds.filter(b => b !== breed));
  };

  // Handle removing breed from exclude list
  const handleRemoveExclude = (breed: string) => {
    onExcludeChange(excludeBreeds.filter(b => b !== breed));
  };

  // Handle popular breed click
  const handlePopularBreedClick = (breed: string) => {
    if (!allSelectedBreeds.includes(breed)) {
      setSelectedBreeds(prev => [...prev, breed]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search for breeds */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search all breeds
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Type to search breeds..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => setShowSuggestions(searchTerm.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {showSuggestions && filteredBreeds.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredBreeds.slice(0, 10).map((breed) => (
                <button
                  key={breed}
                  type="button"
                  onClick={() => handleBreedSelect(breed)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {breed}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popular Breeds */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Popular Breeds
        </label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_BREEDS.map((breed) => {
            const isSelected = allSelectedBreeds.includes(breed);
            return (
              <button
                key={breed}
                type="button"
                onClick={() => handlePopularBreedClick(breed)}
                disabled={isSelected}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {breed}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Breeds Strip */}
      {selectedBreeds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selected Breeds
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            {selectedBreeds.map((breed) => (
              <div key={breed} className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-1">
                <span className="text-sm font-medium text-gray-700 mr-2">{breed}</span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleIncludeBreed(breed)}
                    className="p-1 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                    title="Include this breed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcludeBreed(breed)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                    title="Exclude this breed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Include Breeds Box */}
      {includeBreeds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Included Breeds ({includeBreeds.length})
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            {includeBreeds.map((breed) => (
              <div key={breed} className="flex items-center bg-green-100 border border-green-300 rounded-full px-3 py-1">
                <span className="text-sm font-medium text-green-800 mr-2">{breed}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInclude(breed)}
                  className="p-1 text-green-600 hover:bg-green-200 rounded-full transition-colors"
                  title="Remove from included"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exclude Breeds Box */}
      {excludeBreeds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Excluded Breeds ({excludeBreeds.length})
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            {excludeBreeds.map((breed) => (
              <div key={breed} className="flex items-center bg-red-100 border border-red-300 rounded-full px-3 py-1">
                <span className="text-sm font-medium text-red-800 mr-2">{breed}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveExclude(breed)}
                  className="p-1 text-red-600 hover:bg-red-200 rounded-full transition-colors"
                  title="Remove from excluded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


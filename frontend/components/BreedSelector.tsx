'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';

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
  'Old English Sheepdog', 'Otterhound', 'Papillon', 'Parson Russell Terrier',
  'Pekingese', 'Pembroke Welsh Corgi', 'Petit Basset Griffon Vendeen', 'Pharaoh Hound',
  'Plott', 'Pointer', 'Polish Lowland Sheepdog', 'Pomeranian', 'Poodle',
  'Portuguese Water Dog', 'Pug', 'Puli', 'Pumi', 'Pyrenean Shepherd', 'Redbone Coonhound',
  'Rhodesian Ridgeback', 'Rottweiler', 'Saint Bernard', 'Saluki', 'Samoyed',
  'Schipperke', 'Scottish Deerhound', 'Scottish Terrier', 'Sealyham Terrier',
  'Shetland Sheepdog', 'Shiba Inu', 'Shih Tzu', 'Siberian Husky', 'Silky Terrier',
  'Smooth Fox Terrier', 'Soft Coated Wheaten Terrier', 'Spinone Italiano',
  'Staffordshire Bull Terrier', 'Standard Schnauzer', 'Sussex Spaniel',
  'Swedish Vallhund', 'Tibetan Mastiff', 'Tibetan Spaniel', 'Tibetan Terrier',
  'Toy Fox Terrier', 'Treeing Walker Coonhound', 'Vizsla', 'Weimaraner',
  'Welsh Springer Spaniel', 'Welsh Terrier', 'West Highland White Terrier',
  'Whippet', 'Wirehaired Pointing Griffon', 'Xoloitzcuintli', 'Yorkshire Terrier'
];

type BreedState = 'neutral' | 'include' | 'exclude';

interface BreedSelectorProps {
  includeBreeds: string[];
  excludeBreeds: string[];
  onIncludeChange: (breeds: string[]) => void;
  onExcludeChange: (breeds: string[]) => void;
}

export default function BreedSelector({ 
  includeBreeds, 
  excludeBreeds, 
  onIncludeChange, 
  onExcludeChange 
}: BreedSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get breed state for a given breed
  const getBreedState = (breed: string): BreedState => {
    if (excludeBreeds.includes(breed)) return 'exclude';
    if (includeBreeds.includes(breed)) return 'include';
    return 'neutral';
  };

  // Cycle through states: neutral → include → exclude → neutral
  const cycleBreedState = (breed: string) => {
    const currentState = getBreedState(breed);
    
    switch (currentState) {
      case 'neutral':
        // Add to include, remove from exclude
        onIncludeChange([...includeBreeds, breed]);
        onExcludeChange(excludeBreeds.filter(b => b !== breed));
        break;
      case 'include':
        // Remove from include, add to exclude
        onIncludeChange(includeBreeds.filter(b => b !== breed));
        onExcludeChange([...excludeBreeds, breed]);
        break;
      case 'exclude':
        // Remove from exclude, back to neutral
        onExcludeChange(excludeBreeds.filter(b => b !== breed));
        break;
    }
  };

  // Handle autocomplete search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.length > 0) {
      const filtered = ALL_BREEDS.filter(breed =>
        breed.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limit to 10 suggestions
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Add breed from autocomplete
  const addBreed = (breed: string) => {
    if (!includeBreeds.includes(breed) && !excludeBreeds.includes(breed)) {
      onIncludeChange([...includeBreeds, breed]);
    }
    setSearchTerm('');
    setShowSuggestions(false);
  };

  // Remove breed from either list
  const removeBreed = (breed: string) => {
    onIncludeChange(includeBreeds.filter(b => b !== breed));
    onExcludeChange(excludeBreeds.filter(b => b !== breed));
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getChipStyles = (state: BreedState) => {
    switch (state) {
      case 'include':
        return 'bg-green-500 text-white border-green-500';
      case 'exclude':
        return 'bg-red-500 text-white border-red-500';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Autocomplete Section - Moved to top */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search all breeds
        </label>
        <div className="relative" ref={inputRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Add another breed..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((breed) => (
                <button
                  key={breed}
                  type="button"
                  onClick={() => addBreed(breed)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                >
                  {breed}
                </button>
              ))}
            </div>
          )}
          
          {/* No results message */}
          {showSuggestions && suggestions.length === 0 && searchTerm.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
              <p className="text-sm text-gray-500">Breed not found</p>
            </div>
          )}
        </div>
      </div>

      {/* Popular Breeds Grid */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Popular Breeds
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {POPULAR_BREEDS.map((breed) => {
            const state = getBreedState(breed);
            return (
              <button
                key={breed}
                type="button"
                onClick={() => cycleBreedState(breed)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${getChipStyles(state)}`}
              >
                {breed}
              </button>
            );
          })}
        </div>
      </div>

      {/* Separate Include/Exclude Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Included Breeds */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 className="text-sm font-medium text-green-800 mb-3">Included Breeds</h3>
          {includeBreeds.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {includeBreeds.map((breed) => (
                  <span
                    key={`include-${breed}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {breed}
                    <button
                      type="button"
                      onClick={() => removeBreed(breed)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-sm text-green-700">
                Including {includeBreeds.length} breeds
              </p>
            </div>
          ) : (
            <p className="text-sm text-green-600 italic">No breeds included yet</p>
          )}
        </div>

        {/* Excluded Breeds */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 className="text-sm font-medium text-red-800 mb-3">Excluded Breeds</h3>
          {excludeBreeds.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {excludeBreeds.map((breed) => (
                  <span
                    key={`exclude-${breed}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                  >
                    {breed}
                    <button
                      type="button"
                      onClick={() => removeBreed(breed)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-sm text-red-700">
                Excluding {excludeBreeds.length} breeds
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-600 italic">No breeds excluded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

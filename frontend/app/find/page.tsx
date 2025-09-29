'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Ruler, X, Info } from 'lucide-react';
// Removed breed selector - using free text fields instead

// Helper component for pill controls
interface PillControlProps {
  options: Array<{ value: string; label: string; description: string; icon?: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  multiSelect?: boolean;
  showDescriptions?: boolean;
  cardStyle?: boolean;
}

function PillControl({ options, selectedValues, onChange, multiSelect = true, showDescriptions = true, cardStyle = false }: PillControlProps) {
  const handleToggle = (value: string) => {
    if (multiSelect) {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter(v => v !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    } else {
      onChange(selectedValues.includes(value) ? [] : [value]);
    }
  };

  return (
    <div className="space-y-3">
      {showDescriptions && (
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
        {options.map((option, index) => (
          <span key={option.value} className="inline-flex items-center">
            {index > 0 && <span className="text-gray-400 mr-2">·</span>}
            <span className="font-medium">{option.label}</span>
            <span className="ml-1">({option.description})</span>
          </span>
        ))}
        </div>
      )}
      <div className={`flex flex-wrap gap-3 ${cardStyle ? 'grid grid-cols-2 md:grid-cols-4 gap-4' : ''}`}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              className={`${
                cardStyle 
                  ? `p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`
                  : `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`
              }`}
            >
              {cardStyle ? (
                <div className="text-center">
                  {option.icon && <div className="text-2xl mb-2">{option.icon}</div>}
                  <div className="font-semibold text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  {option.icon && <span>{option.icon}</span>}
                  {option.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FindPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    zipCodes: [] as string[],
    age: [] as string[],
    size: [] as string[],
    includeBreeds: [] as string[],
    excludeBreeds: [] as string[],
    temperament: [] as string[],
    energy: '',
    guidance: ''
  });
  
  const [newZipCode, setNewZipCode] = useState('');
  const [newIncludeBreed, setNewIncludeBreed] = useState('');
  const [newExcludeBreed, setNewExcludeBreed] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  const ageOptions = [
    { value: 'baby', label: 'Baby', description: '0–6 months' },
    { value: 'young', label: 'Young', description: '6 months–2 years' },
    { value: 'adult', label: 'Adult', description: '2–8 years' },
    { value: 'senior', label: 'Senior', description: '8+ years' }
  ];
  
  const sizeOptions = [
    { value: 'small', label: 'Small', description: '< 25 lbs', icon: '🐕' },
    { value: 'medium', label: 'Medium', description: '25–50 lbs', icon: '🐕‍🦺' },
    { value: 'large', label: 'Large', description: '50–90 lbs', icon: '🐕‍🦺' },
    { value: 'xl', label: 'XL', description: '90+ lbs', icon: '🐕‍🦺' }
  ];
  
  const temperamentOptions = [
    { value: 'affectionate', label: 'Affectionate', description: 'Loves cuddles and attention' },
    { value: 'good-with-kids', label: 'Good with kids', description: 'Gentle and patient with children' },
    { value: 'good-with-dogs', label: 'Good with dogs', description: 'Gets along with other dogs' },
    { value: 'good-with-cats', label: 'Good with cats', description: 'Compatible with cats' },
    { value: 'protective', label: 'Protective', description: 'Guards family and home' },
    { value: 'playful', label: 'Playful', description: 'Loves games and toys' },
    { value: 'independent', label: 'Independent', description: 'Can be left alone for periods' },
    { value: 'quiet', label: 'Quiet', description: 'Low barking, calm demeanor' },
    { value: 'easy-to-train', label: 'Easy to train', description: 'Quick to learn commands' },
    { value: 'hypoallergenic', label: 'Hypoallergenic', description: 'Low shedding, allergy-friendly' }
  ];
  
  const energyOptions = [
    { value: 'low', label: 'Low', description: '~30 min/day · Short walks + naps', icon: '💤' },
    { value: 'medium', label: 'Medium', description: '~1 hr/day · Playtime + walks', icon: '🙂' },
    { value: 'high', label: 'High', description: '2+ hrs/day · Needs runs/hikes/training', icon: '🏃' }
  ];

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle adding zip codes
  const handleAddZipCode = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newZipCode.trim()) {
      e.preventDefault();
      const zipCode = newZipCode.trim();
      // Validate zip code (5 digits)
      if (/^\d{5}$/.test(zipCode)) {
        if (!formData.zipCodes.includes(zipCode)) {
          setFormData(prev => ({
            ...prev,
            zipCodes: [...prev.zipCodes, zipCode]
          }));
        }
        setNewZipCode('');
      }
    }
  };

  const handleRemoveZipCode = (zipCode: string) => {
    setFormData(prev => ({
      ...prev,
      zipCodes: prev.zipCodes.filter(z => z !== zipCode)
    }));
  };

  // Handle adding include breeds
  const handleAddIncludeBreed = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newIncludeBreed.trim()) {
      e.preventDefault();
      if (!formData.includeBreeds.includes(newIncludeBreed.trim())) {
        setFormData(prev => ({
          ...prev,
          includeBreeds: [...prev.includeBreeds, newIncludeBreed.trim()]
        }));
      }
      setNewIncludeBreed('');
    }
  };

  const handleRemoveIncludeBreed = (breed: string) => {
    setFormData(prev => ({
      ...prev,
      includeBreeds: prev.includeBreeds.filter(b => b !== breed)
    }));
  };

  // Handle adding exclude breeds
  const handleAddExcludeBreed = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newExcludeBreed.trim()) {
      e.preventDefault();
      if (!formData.excludeBreeds.includes(newExcludeBreed.trim())) {
        setFormData(prev => ({
          ...prev,
          excludeBreeds: [...prev.excludeBreeds, newExcludeBreed.trim()]
        }));
      }
      setNewExcludeBreed('');
    }
  };

  const handleRemoveExcludeBreed = (breed: string) => {
    setFormData(prev => ({
      ...prev,
      excludeBreeds: prev.excludeBreeds.filter(b => b !== breed)
    }));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (formData.zipCodes.length > 0) params.set('zip', formData.zipCodes.join(','));
    params.set('radius', '50'); // Hardcoded to 50 miles
    if (formData.age.length > 0) params.set('age', formData.age.join(','));
    if (formData.size.length > 0) params.set('size', formData.size.join(','));
    if (formData.includeBreeds.length > 0) params.set('includeBreeds', formData.includeBreeds.join(','));
    if (formData.excludeBreeds.length > 0) params.set('excludeBreeds', formData.excludeBreeds.join(','));
    if (formData.temperament.length > 0) params.set('temperament', formData.temperament.join(','));
    if (formData.energy) params.set('energy', formData.energy);
    if (formData.guidance) params.set('guidance', formData.guidance);
    
    // Navigate to results page
    router.push(`/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
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
                <Link href="/" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </Link>
                <Link href="/find" className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium">
                  Find a Dog
                </Link>
                <Link href="/about" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  About
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Find your perfect dog</h1>
            <p className="text-gray-600">Tell us about your lifestyle and preferences to get personalized matches</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Zip Codes (50 mile radius)
              </label>
              <input
                type="text"
                placeholder="Enter 5-digit zip code and press Enter"
                value={newZipCode}
                onChange={(e) => setNewZipCode(e.target.value)}
                onKeyDown={handleAddZipCode}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.zipCodes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.zipCodes.map((zipCode) => (
                    <div key={zipCode} className="flex items-center bg-blue-100 border border-blue-300 rounded-full px-3 py-1">
                      <span className="text-sm font-medium text-blue-800 mr-2">{zipCode}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveZipCode(zipCode)}
                        className="p-1 text-blue-600 hover:bg-blue-200 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">Type a zip code and press Enter to add it. Add multiple zip codes to search broader areas.</p>
            </div>

            {/* Breeds to Include */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Breeds to Include/Consider
              </label>
              <input
                type="text"
                placeholder="Enter breed (e.g., 'Lab mix', 'Golden Retriever', 'Pit Bull') and press Enter"
                value={newIncludeBreed}
                onChange={(e) => setNewIncludeBreed(e.target.value)}
                onKeyDown={handleAddIncludeBreed}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.includeBreeds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.includeBreeds.map((breed) => (
                    <div key={breed} className="flex items-center bg-green-100 border border-green-300 rounded-full px-3 py-1">
                      <span className="text-sm font-medium text-green-800 mr-2">{breed}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIncludeBreed(breed)}
                        className="p-1 text-green-600 hover:bg-green-200 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">Enter any breed names, mixes, or descriptions you&apos;d like to see</p>
            </div>

            {/* Breeds to Exclude */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Breeds to Exclude
              </label>
              <input
                type="text"
                placeholder="Enter breed to avoid and press Enter"
                value={newExcludeBreed}
                onChange={(e) => setNewExcludeBreed(e.target.value)}
                onKeyDown={handleAddExcludeBreed}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.excludeBreeds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.excludeBreeds.map((breed) => (
                    <div key={breed} className="flex items-center bg-red-100 border border-red-300 rounded-full px-3 py-1">
                      <span className="text-sm font-medium text-red-800 mr-2">{breed}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExcludeBreed(breed)}
                        className="p-1 text-red-600 hover:bg-red-200 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">Enter any breeds you&apos;d prefer to avoid</p>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Age</label>
              <PillControl
                options={ageOptions}
                selectedValues={formData.age}
                onChange={(values) => handleInputChange('age', values)}
                multiSelect={true}
                showDescriptions={false}
                cardStyle={true}
              />
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Size</label>
              <PillControl
                options={sizeOptions}
                selectedValues={formData.size}
                onChange={(values) => handleInputChange('size', values)}
                multiSelect={true}
                showDescriptions={false}
                cardStyle={true}
              />
            </div>

            {/* Energy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Energy</label>
              <PillControl
                options={energyOptions}
                selectedValues={formData.energy ? [formData.energy] : []}
                onChange={(values) => handleInputChange('energy', values[0] || '')}
                multiSelect={false}
                showDescriptions={false}
                cardStyle={true}
              />
            </div>

            {/* Temperament */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Temperament</label>
              <PillControl
                options={temperamentOptions}
                selectedValues={formData.temperament}
                onChange={(values) => handleInputChange('temperament', values)}
                multiSelect={true}
                showDescriptions={false}
                cardStyle={false}
              />
            </div>

            {/* Guidance */}
            <div>
              <div className="flex items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tell us about your lifestyle
                </label>
                <div className="relative ml-2">
                  <button
                    type="button"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {showTooltip && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-10">
                      <div className="space-y-2">
                        <div><strong>Living situation:</strong> Apartment, house, yard access.</div>
                        <div><strong>Household composition:</strong> Kids, roommates, other pets.</div>
                        <div><strong>Daily activity level:</strong> Sedentary, walks, jogging, hiking, frequent travel.</div>
                        <div><strong>Schedule & availability:</strong> Long workdays vs. work from home.</div>
                        <div><strong>Experience with dogs:</strong> First-time owner vs. experienced.</div>
                        <div><strong>Deal-breakers:</strong> Can't handle shedding, barking, high vet costs, etc.</div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>
              <textarea
                placeholder="I live in a two-bedroom apartment with no yard but a park nearby. My wife and I work from home most days, so the dog won't be left alone for long. We don't have kids yet, but we often host friends who bring their dogs. We're active and go jogging 3–4 times a week. This will be our first dog, so we'd like one that's affectionate, easy to train, and not super high-maintenance. We'd prefer to avoid breeds that shed heavily or need constant grooming."
                value={formData.guidance}
                onChange={(e) => handleInputChange('guidance', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Search className="w-5 h-5 mr-2" />
                See my matches
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

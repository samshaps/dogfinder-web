'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Ruler } from 'lucide-react';
import BreedSelector from '@/components/BreedSelector';

// Helper component for pill controls
interface PillControlProps {
  options: Array<{ value: string; label: string; description: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  multiSelect?: boolean;
  showDescriptions?: boolean;
}

function PillControl({ options, selectedValues, onChange, multiSelect = true, showDescriptions = true }: PillControlProps) {
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
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {option.label}
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
    zip: '',
    radius: 50,
    age: [] as string[],
    size: [] as string[],
    includeBreeds: [] as string[],
    excludeBreeds: [] as string[],
    temperament: [] as string[],
    energy: '',
    guidance: ''
  });

  const ageOptions = [
    { value: 'baby', label: 'Baby', description: '0–6 months' },
    { value: 'young', label: 'Young', description: '6 months–2 years' },
    { value: 'adult', label: 'Adult', description: '2–8 years' },
    { value: 'senior', label: 'Senior', description: '8+ years' }
  ];
  
  const sizeOptions = [
    { value: 'small', label: 'Small', description: '< 25 lbs' },
    { value: 'medium', label: 'Medium', description: '25–50 lbs' },
    { value: 'large', label: 'Large', description: '50–90 lbs' },
    { value: 'xl', label: 'XL', description: '90+ lbs' }
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
    { value: 'low', label: 'Low', description: '~30 min/day · Short walks + naps' },
    { value: 'medium', label: 'Medium', description: '~1 hr/day · Playtime + walks' },
    { value: 'high', label: 'High', description: '2+ hrs/day · Needs runs/hikes/training' }
  ];

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (formData.zip) params.set('zip', formData.zip);
    params.set('radius', formData.radius.toString());
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
                Location
              </label>
              <input
                type="text"
                placeholder="Enter your zip code"
                value={formData.zip}
                onChange={(e) => handleInputChange('zip', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">We&apos;ll show you dogs within your area</p>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Ruler className="w-4 h-4 inline mr-2" />
                Radius (miles)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={formData.radius}
                  onChange={(e) => handleInputChange('radius', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-semibold text-gray-900 min-w-[3rem] text-center">
                  {formData.radius}
                </span>
              </div>
            </div>

            {/* Breeds */}
            <div>
              <BreedSelector
                includeBreeds={formData.includeBreeds}
                excludeBreeds={formData.excludeBreeds}
                onIncludeChange={(breeds) => handleInputChange('includeBreeds', breeds)}
                onExcludeChange={(breeds) => handleInputChange('excludeBreeds', breeds)}
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Age</label>
              <PillControl
                options={ageOptions}
                selectedValues={formData.age}
                onChange={(values) => handleInputChange('age', values)}
                multiSelect={true}
                showDescriptions={true}
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
                showDescriptions={true}
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
                showDescriptions={true}
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
              />
            </div>

            {/* Guidance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guidance
              </label>
              <textarea
                placeholder="Tell us about your lifestyle, home, and preferences. The more details, the better the matches!"
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

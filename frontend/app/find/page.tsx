'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Ruler, X, Info, Save, Check } from 'lucide-react';
import { useUser } from '@/lib/auth/user-context';
import { trackEvent } from '@/lib/analytics/tracking';
import Navigation from '@/components/Navigation';
import { validateFormData, getExpectedApiPayload, logValidationResults } from '@/lib/validation/preferences-mapping';
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
  const pathname = usePathname();
  const { user } = useUser();
  const [formData, setFormData] = useState({
    zipCodes: [] as string[],
    age: [] as string[],
    size: [] as string[],
    includeBreeds: [] as string[],
    excludeBreeds: [] as string[],
    temperament: [] as string[],
    energy: '',
    guidance: '',
    touched: {
      age: false,
      size: false,
      energy: false,
      temperament: false,
      breedsInclude: false,
      breedsExclude: false,
    }
  });
  
  const [newZipCode, setNewZipCode] = useState('');
  const [newIncludeBreed, setNewIncludeBreed] = useState('');
  const [newExcludeBreed, setNewExcludeBreed] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const isLoadingPreferencesRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);

  // Load saved preferences when user is authenticated or when navigating to this page
  useEffect(() => {
    // Only proceed if we're on the /find page
    if (pathname !== '/find') {
      return;
    }

    const loadPreferences = async () => {
      // Don't load if no user
      if (!user) return;

      // Prevent duplicate loads within 1 second
      const now = Date.now();
      if (isLoadingPreferencesRef.current || (now - lastLoadTimeRef.current < 1000)) {
        console.log('⏭️ Skipping duplicate load request');
        return;
      }

      isLoadingPreferencesRef.current = true;
      lastLoadTimeRef.current = now;

      console.log('🔍 Starting to load preferences for user:', user.email);
      console.log('🔍 Current pathname:', pathname);
      
      try {
        console.log('🔍 Making request to /api/preferences...');
        const response = await fetch('/api/preferences');
        console.log('🔍 Response status:', response.status);
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('🔍 Response data:', responseData);
          
          // Handle wrapped API response format: {success: true, data: {preferences: {...}}}
          const preferences = responseData.data?.preferences || responseData.preferences;
          
          if (preferences) {
            console.log('🔍 Raw preferences from API:', preferences);
            
            setFormData({
              zipCodes: preferences.zip_codes || [],
              age: preferences.age_preferences || [],
              size: preferences.size_preferences || [],
              includeBreeds: preferences.include_breeds || [],
              excludeBreeds: preferences.exclude_breeds || [],
              temperament: preferences.temperament_traits || [],
              energy: preferences.energy_level || '',
              guidance: preferences.living_situation?.description || '',
              touched: {
                age: (preferences.age_preferences?.length || 0) > 0,
                size: (preferences.size_preferences?.length || 0) > 0,
                energy: !!preferences.energy_level,
                temperament: (preferences.temperament_traits?.length || 0) > 0,
                breedsInclude: (preferences.include_breeds?.length || 0) > 0,
                breedsExclude: (preferences.exclude_breeds?.length || 0) > 0,
              }
            });
            console.log('✅ Loaded saved preferences and updated form data');
          } else {
            console.log('ℹ️ No preferences found in response');
          }
        } else {
          const errorText = await response.text();
          console.error('❌ API request failed:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Failed to load preferences:', error);
      } finally {
        isLoadingPreferencesRef.current = false;
      }
    };

    loadPreferences();
  }, [user, pathname]);

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
    { value: 'eager-to-please', label: 'Eager to please', description: 'Quick to learn and obey' },
    { value: 'intelligent', label: 'Intelligent', description: 'Smart and quick-witted' },
    { value: 'focused', label: 'Focused', description: 'Concentrates on tasks well' },
    { value: 'adaptable', label: 'Adaptable', description: 'Adjusts well to new situations' },
    { value: 'independent-thinker', label: 'Independent thinker', description: 'Makes own decisions' },
    { value: 'loyal', label: 'Loyal', description: 'Devoted and faithful' },
    { value: 'protective', label: 'Protective', description: 'Guards family and home' },
    { value: 'confident', label: 'Confident', description: 'Self-assured and bold' },
    { value: 'gentle', label: 'Gentle', description: 'Soft and tender nature' },
    { value: 'sensitive', label: 'Sensitive', description: 'Emotionally responsive' },
    { value: 'playful', label: 'Playful', description: 'Loves games and toys' },
    { value: 'calm-indoors', label: 'Calm indoors', description: 'Relaxed inside the home' },
    { value: 'alert-watchful', label: 'Alert/watchful', description: 'Always aware of surroundings' },
    { value: 'quiet', label: 'Quiet', description: 'Low barking, calm demeanor' },
    { value: 'companion-driven', label: 'Companion-driven', description: 'Loves being near people' }
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Capture any in-progress text entries that weren't confirmed with Enter
    const pending = { ...formData };
    const maybeZip = newZipCode.trim();
    if (/^\d{5}$/.test(maybeZip) && !pending.zipCodes.includes(maybeZip)) {
      pending.zipCodes = [...pending.zipCodes, maybeZip];
    }
    const inc = newIncludeBreed.trim();
    if (inc.length > 0 && !pending.includeBreeds.includes(inc)) {
      pending.includeBreeds = [...pending.includeBreeds, inc];
      pending.touched = { ...(pending.touched || {}), breedsInclude: true };
    }
    const exc = newExcludeBreed.trim();
    if (exc.length > 0 && !pending.excludeBreeds.includes(exc)) {
      pending.excludeBreeds = [...pending.excludeBreeds, exc];
      pending.touched = { ...(pending.touched || {}), breedsExclude: true };
    }

      // Save preferences automatically if user is authenticated
      if (user) {
        try {
          // Validate form data before sending to API
          console.log('🔍 Validating form data before API call...');
          const validationResult = validateFormData(pending);
          logValidationResults(validationResult, 'Form Data Validation');
          
          if (!validationResult.isValid) {
            console.error('❌ Form validation failed, not sending to API:', validationResult.errors);
            alert(`Form validation failed: ${validationResult.errors.join(', ')}`);
            return;
          }

          // Generate expected API payload
          const prefsPayload = getExpectedApiPayload(pending);
          
          console.log('🔍 Saving preferences for user:', user.email);
          console.log('🔍 Form data (pending):', pending);
          console.log('🔍 Generated API payload:', prefsPayload);
          console.log('🔍 JSON.stringify result:', JSON.stringify(prefsPayload));

          const response = await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prefsPayload)
          });

          console.log('🔍 Save response status:', response.status);

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Preferences saved successfully:', result);
            
            // Verify the save was successful
            const savedPreferences = result.data?.preferences || result.preferences;
            if (savedPreferences) {
              console.log('✅ Verified preferences saved:', savedPreferences);
            } else {
              console.warn('⚠️ Save response received but preferences data not found in response');
            }
            
            setPreferencesSaved(true);
            trackEvent('preferences_saved', {
              user_id: user.id,
              source: 'find_page'
            });
            setTimeout(() => setPreferencesSaved(false), 2000);
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to save preferences:', response.status, errorText);
            console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
            
            // Try to parse error response for more details
            let errorMessage = 'Failed to save preferences';
            try {
              const errorData = JSON.parse(errorText);
              console.error('❌ Parsed error response:', errorData);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
              console.error('❌ Could not parse error response as JSON');
            }
            
            // Show error to user but don't block navigation
            alert(`Warning: ${errorMessage}. Your search will still proceed, but preferences may not be saved.`);
          }
        } catch (error) {
          console.error('❌ Error saving preferences:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Error saving preferences: ${errorMessage}. Your search will still proceed.`);
        }
      }

    // Build query parameters
    const params = new URLSearchParams();
    if (pending.zipCodes.length > 0) params.set('zip', pending.zipCodes.join(','));
    params.set('radius', '50'); // Hardcoded to 50 miles
    if (pending.age.length > 0) params.set('age', pending.age.join(','));
    if (pending.size.length > 0) params.set('size', pending.size.join(','));
    if (pending.includeBreeds.length > 0) params.set('includeBreeds', pending.includeBreeds.join(','));
    if (pending.excludeBreeds.length > 0) params.set('excludeBreeds', pending.excludeBreeds.join(','));
    if (pending.temperament.length > 0) params.set('temperament', pending.temperament.join(','));
    if (pending.energy) params.set('energy', pending.energy);
    if (pending.guidance) params.set('guidance', pending.guidance);
    // touched flags → query params (t_field=1)
    const t = pending.touched || {};
    Object.entries(t).forEach(([k, v]) => { if (v) params.set(`t_${k}`, '1'); });
    
    // Navigate to results page
    router.push(`/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Let's make you a match</h1>
            <p className="text-gray-600">Tell us about your lifestyle and preferences. Fill out as many or as few as you want.</p>
          </div>

          {/* Preferences Saved Indicator */}
          {user && preferencesSaved && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Preferences saved!</span>
                <span className="text-sm">Your search criteria will be remembered for next time.</span>
              </div>
            </div>
          )}

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
                onChange={(values) => setFormData(prev => ({ ...prev, age: values, touched: { ...prev.touched, age: true } }))}
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
                onChange={(values) => setFormData(prev => ({ ...prev, size: values, touched: { ...prev.touched, size: true } }))}
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
                onChange={(values) => setFormData(prev => ({ ...prev, energy: values[0] || '', touched: { ...prev.touched, energy: true } }))}
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
                onChange={(values) => setFormData(prev => ({ ...prev, temperament: values, touched: { ...prev.touched, temperament: true } }))}
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

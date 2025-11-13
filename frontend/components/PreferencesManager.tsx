"use client";

import { useState, useEffect } from 'react';
import { usePreferences, UserPreferences } from '@/lib/hooks/use-preferences';
import { trackEvent } from '@/lib/analytics/tracking';

interface PreferencesManagerProps {
  initialPreferences?: UserPreferences | null;
  onSave?: (preferences: UserPreferences) => void;
  onCancel?: () => void;
  mode?: 'edit' | 'view';
}

export function PreferencesManager({ 
  initialPreferences, 
  onSave, 
  onCancel,
  mode = 'edit' 
}: PreferencesManagerProps) {
  const { preferences, loading, error, savePreferences } = usePreferences();
  const [formData, setFormData] = useState<Partial<UserPreferences>>({
    zip_codes: [],
    age_preferences: [],
    size_preferences: [],
    energy_level: '',
    include_breeds: [],
    exclude_breeds: [],
    temperament_traits: [],
    living_situation: {},
    notification_preferences: {},
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form data
  useEffect(() => {
    const sourcePreferences = initialPreferences || preferences;
    if (sourcePreferences) {
      setFormData({
        zip_codes: sourcePreferences.zip_codes || [],
        age_preferences: sourcePreferences.age_preferences || [],
        size_preferences: sourcePreferences.size_preferences || [],
        energy_level: sourcePreferences.energy_level || '',
        include_breeds: sourcePreferences.include_breeds || [],
        exclude_breeds: sourcePreferences.exclude_breeds || [],
        temperament_traits: sourcePreferences.temperament_traits || [],
        living_situation: sourcePreferences.living_situation || {},
        notification_preferences: sourcePreferences.notification_preferences || {},
      });
    }
  }, [initialPreferences, preferences]);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      trackEvent('preferences_saved', {
        has_zip_codes: (formData.zip_codes?.length || 0) > 0,
        has_age_preferences: (formData.age_preferences?.length || 0) > 0,
        has_size_preferences: (formData.size_preferences?.length || 0) > 0,
        has_energy_level: !!formData.energy_level,
        has_include_breeds: (formData.include_breeds?.length || 0) > 0,
        has_exclude_breeds: (formData.exclude_breeds?.length || 0) > 0,
        has_temperament_traits: (formData.temperament_traits?.length || 0) > 0,
        has_living_situation: Object.keys(formData.living_situation || {}).length > 0,
        has_notification_preferences: Object.keys(formData.notification_preferences || {}).length > 0,
      });

      const savedPreferences = await savePreferences(formData);
      setIsDirty(false);
      onSave?.(savedPreferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsDirty(false);
    onCancel?.();
  };

  const updateFormData = (updates: Partial<UserPreferences>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const addZipCode = (zipCode: string) => {
    if (zipCode && /^\d{5}$/.test(zipCode) && !formData.zip_codes?.includes(zipCode)) {
      updateFormData({
        zip_codes: [...(formData.zip_codes || []), zipCode]
      });
    }
  };

  const removeZipCode = (zipCode: string) => {
    updateFormData({
      zip_codes: formData.zip_codes?.filter(z => z !== zipCode) || []
    });
  };

  const toggleArrayItem = (field: keyof UserPreferences, value: string) => {
    const currentArray = formData[field] as string[] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFormData({ [field]: newArray });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">Error: {error}</p>
        </div>
      )}

      {/* Location Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Codes
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.zip_codes?.map(zip => (
                <span
                  key={zip}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {zip}
                  {mode === 'edit' && (
                    <button
                      onClick={() => removeZipCode(zip)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {mode === 'edit' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 5-digit ZIP code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addZipCode(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    addZipCode(input.value);
                    input.value = '';
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dog Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dog Preferences</h3>
        
        {/* Age Preferences */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age
          </label>
          <div className="flex flex-wrap gap-2">
            {['puppy', 'young', 'adult', 'senior'].map(age => (
              <button
                key={age}
                onClick={() => mode === 'edit' && toggleArrayItem('age_preferences', age)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.age_preferences?.includes(age)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${mode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {age.charAt(0).toUpperCase() + age.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Size Preferences */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Size
          </label>
          <div className="flex flex-wrap gap-2">
            {['small', 'medium', 'large'].map(size => (
              <button
                key={size}
                onClick={() => mode === 'edit' && toggleArrayItem('size_preferences', size)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.size_preferences?.includes(size)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${mode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Energy Level */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Energy Level
          </label>
          <div className="flex flex-wrap gap-2">
            {['low', 'medium', 'high'].map(energy => (
              <button
                key={energy}
                onClick={() => mode === 'edit' && updateFormData({ energy_level: energy })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.energy_level === energy
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${mode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {energy.charAt(0).toUpperCase() + energy.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Living Situation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Living Situation</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="has_yard"
              checked={formData.living_situation?.has_yard || false}
              onChange={(e) => mode === 'edit' && updateFormData({
                living_situation: { ...formData.living_situation, has_yard: e.target.checked }
              })}
              disabled={mode === 'view'}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="has_yard" className="ml-2 text-sm text-gray-700">
              Have a yard
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="has_children"
              checked={formData.living_situation?.has_children || false}
              onChange={(e) => mode === 'edit' && updateFormData({
                living_situation: { ...formData.living_situation, has_children: e.target.checked }
              })}
              disabled={mode === 'view'}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="has_children" className="ml-2 text-sm text-gray-700">
              Have children
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="has_other_pets"
              checked={formData.living_situation?.has_other_pets || false}
              onChange={(e) => mode === 'edit' && updateFormData({
                living_situation: { ...formData.living_situation, has_other_pets: e.target.checked }
              })}
              disabled={mode === 'view'}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="has_other_pets" className="ml-2 text-sm text-gray-700">
              Have other pets
            </label>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="email_alerts"
              checked={formData.notification_preferences?.email_alerts || false}
              onChange={(e) => mode === 'edit' && updateFormData({
                notification_preferences: { ...formData.notification_preferences, email_alerts: e.target.checked }
              })}
              disabled={mode === 'view'}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="email_alerts" className="ml-2 text-sm text-gray-700">
              Receive email alerts for new matches
            </label>
          </div>

          {formData.notification_preferences?.email_alerts && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Frequency
              </label>
              <div className="flex flex-wrap gap-2">
                {['daily', 'weekly'].map(frequency => (
                  <button
                    key={frequency}
                    onClick={() => mode === 'edit' && updateFormData({
                      notification_preferences: { ...formData.notification_preferences, frequency }
                    })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.notification_preferences?.frequency === frequency
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${mode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {mode === 'edit' && (
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}
    </div>
  );
}

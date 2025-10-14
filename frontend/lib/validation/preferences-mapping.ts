/**
 * Comprehensive validation mapping for /find page inputs to preferences API schema
 * This ensures all form data matches the expected API validation schema
 */

// Form input options from /find page
export const FORM_OPTIONS = {
  age: ['baby', 'young', 'adult', 'senior'] as const,
  size: ['small', 'medium', 'large', 'xl'] as const,
  energy: ['low', 'medium', 'high'] as const,
  temperament: [
    'eager-to-please',
    'intelligent', 
    'focused',
    'adaptable',
    'independent-thinker',
    'loyal',
    'protective',
    'confident',
    'gentle',
    'sensitive',
    'playful',
    'calm-indoors',
    'alert-watchful',
    'quiet',
    'companion-driven'
  ] as const,
} as const;

// API validation schema enums
export const API_SCHEMA = {
  age_preferences: ['baby', 'young', 'adult', 'senior'] as const,
  size_preferences: ['small', 'medium', 'large', 'xl'] as const,
  energy_level: ['low', 'medium', 'high'] as const,
  temperament_traits: 'string[]' as const, // No enum restriction in API
} as const;

/**
 * Validation mapping results
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that all form options match API schema expectations
 */
export function validateFormToApiMapping(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Age validation
  const ageFormValues = new Set(FORM_OPTIONS.age);
  const ageApiValues = new Set(API_SCHEMA.age_preferences);
  
  // Check if form has values not in API schema
  for (const formValue of ageFormValues) {
    if (!ageApiValues.has(formValue)) {
      errors.push(`Age form value "${formValue}" not in API schema age_preferences`);
    }
  }
  
  // Check if API has values not in form
  for (const apiValue of ageApiValues) {
    if (!ageFormValues.has(apiValue)) {
      warnings.push(`API schema has age_preferences "${apiValue}" not available in form`);
    }
  }

  // 2. Size validation
  const sizeFormValues = new Set(FORM_OPTIONS.size);
  const sizeApiValues = new Set(API_SCHEMA.size_preferences);
  
  for (const formValue of sizeFormValues) {
    if (!sizeApiValues.has(formValue)) {
      errors.push(`Size form value "${formValue}" not in API schema size_preferences`);
    }
  }
  
  for (const apiValue of sizeApiValues) {
    if (!sizeFormValues.has(apiValue)) {
      warnings.push(`API schema has size_preferences "${apiValue}" not available in form`);
    }
  }

  // 3. Energy validation
  const energyFormValues = new Set(FORM_OPTIONS.energy);
  const energyApiValues = new Set(API_SCHEMA.energy_level);
  
  for (const formValue of energyFormValues) {
    if (!energyApiValues.has(formValue)) {
      errors.push(`Energy form value "${formValue}" not in API schema energy_level`);
    }
  }
  
  for (const apiValue of energyApiValues) {
    if (!energyFormValues.has(apiValue)) {
      warnings.push(`API schema has energy_level "${apiValue}" not available in form`);
    }
  }

  // 4. Temperament validation
  // Temperament uses string[] in API, so any string values should be fine
  // But let's log what values we're sending for debugging
  warnings.push(`Temperament form has ${FORM_OPTIONS.temperament.length} options (API accepts any strings)`);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a specific form data object against API schema
 */
export function validateFormData(formData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate age_preferences
  if (formData.age && Array.isArray(formData.age)) {
    for (const age of formData.age) {
      if (!FORM_OPTIONS.age.includes(age as any)) {
        errors.push(`Invalid age value: "${age}". Must be one of: ${FORM_OPTIONS.age.join(', ')}`);
      }
    }
  }

  // Validate size_preferences
  if (formData.size && Array.isArray(formData.size)) {
    for (const size of formData.size) {
      if (!FORM_OPTIONS.size.includes(size as any)) {
        errors.push(`Invalid size value: "${size}". Must be one of: ${FORM_OPTIONS.size.join(', ')}`);
      }
    }
  }

  // Validate energy_level
  if (formData.energy && !FORM_OPTIONS.energy.includes(formData.energy)) {
    errors.push(`Invalid energy value: "${formData.energy}". Must be one of: ${FORM_OPTIONS.energy.join(', ')}`);
  }

  // Validate temperament_traits
  if (formData.temperament && Array.isArray(formData.temperament)) {
    for (const temperament of formData.temperament) {
      if (!FORM_OPTIONS.temperament.includes(temperament as any)) {
        errors.push(`Invalid temperament value: "${temperament}". Must be one of: ${FORM_OPTIONS.temperament.join(', ')}`);
      }
    }
  }

  // Validate zip_codes format
  if (formData.zipCodes && Array.isArray(formData.zipCodes)) {
    for (const zip of formData.zipCodes) {
      if (!/^\d{5}$/.test(zip)) {
        errors.push(`Invalid zip code format: "${zip}". Must be 5 digits.`);
      }
    }
  }

  // Validate guidance text (should be string)
  if (formData.guidance !== undefined && typeof formData.guidance !== 'string') {
    errors.push(`Guidance must be a string, got: ${typeof formData.guidance}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get the expected API payload structure from form data
 */
export function getExpectedApiPayload(formData: any) {
  return {
    zip_codes: formData.zipCodes || [],
    age_preferences: formData.age || [],
    size_preferences: formData.size || [],
    energy_level: formData.energy || undefined,
    include_breeds: formData.includeBreeds || [],
    exclude_breeds: formData.excludeBreeds || [],
    temperament_traits: formData.temperament || [],
    living_situation: {
      description: formData.guidance || undefined,
    },
    notification_preferences: {}
  };
}

/**
 * Log validation results for debugging
 */
export function logValidationResults(result: ValidationResult, context: string = 'Validation') {
  console.group(`🔍 ${context} Results`);
  
  if (result.isValid) {
    console.log('✅ All validations passed');
  } else {
    console.error('❌ Validation errors:', result.errors);
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ Warnings:', result.warnings);
  }
  
  console.groupEnd();
}

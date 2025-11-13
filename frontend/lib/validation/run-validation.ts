/**
 * Run comprehensive validation of form-to-API mapping
 * This script validates that all /find page inputs properly map to preferences API schema
 */

import { validateFormToApiMapping, validateFormData, getExpectedApiPayload, logValidationResults } from './preferences-mapping';

/**
 * Test with sample form data to ensure validation works
 */
function runValidationTests() {
  console.log('🧪 Running comprehensive form-to-API validation tests...\n');

  // Test 1: Form-to-API mapping validation
  console.log('📋 Test 1: Form-to-API Schema Mapping');
  const mappingResult = validateFormToApiMapping();
  logValidationResults(mappingResult, 'Form-to-API Mapping');

  // Test 2: Sample form data validation
  console.log('\n📋 Test 2: Sample Form Data Validation');
  const sampleFormData = {
    zipCodes: ['11211', '10001'],
    age: ['baby', 'young'],
    size: ['medium'],
    energy: 'medium',
    includeBreeds: ['Golden Retriever'],
    excludeBreeds: ['Pit Bull'],
    temperament: ['friendly', 'intelligent'],
    guidance: 'We want a dog that is good with kids'
  };

  const formDataResult = validateFormData(sampleFormData);
  logValidationResults(formDataResult, 'Sample Form Data');

  // Test 3: Invalid form data validation
  console.log('\n📋 Test 3: Invalid Form Data Validation');
  const invalidFormData = {
    zipCodes: ['123', 'abc'], // Invalid zip codes
    age: ['puppy', 'invalid'], // Invalid age values
    size: ['huge'], // Invalid size
    energy: 'super-high', // Invalid energy
    temperament: ['invalid-trait'], // Invalid temperament
    guidance: 123 // Invalid type
  };

  const invalidResult = validateFormData(invalidFormData);
  logValidationResults(invalidResult, 'Invalid Form Data');

  // Test 4: API payload generation
  console.log('\n📋 Test 4: API Payload Generation');
  const expectedPayload = getExpectedApiPayload(sampleFormData);
  console.log('🔍 Expected API payload:', JSON.stringify(expectedPayload, null, 2));

  // Test 5: Edge cases
  console.log('\n📋 Test 5: Edge Cases');
  const edgeCaseData = {
    zipCodes: [], // Empty arrays
    age: [],
    size: [],
    energy: undefined, // Undefined values
    includeBreeds: [],
    excludeBreeds: [],
    temperament: [],
    guidance: '' // Empty string
  };

  const edgeCaseResult = validateFormData(edgeCaseData);
  logValidationResults(edgeCaseResult, 'Edge Cases');

  const edgeCasePayload = getExpectedApiPayload(edgeCaseData);
  console.log('🔍 Edge case API payload:', JSON.stringify(edgeCasePayload, null, 2));

  // Summary
  console.log('\n📊 Validation Summary:');
  console.log(`✅ Form-to-API Mapping: ${mappingResult.isValid ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Sample Form Data: ${formDataResult.isValid ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Invalid Data Detection: ${!invalidResult.isValid ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Edge Cases: ${edgeCaseResult.isValid ? 'PASS' : 'FAIL'}`);

  const allPassed = mappingResult.isValid && formDataResult.isValid && !invalidResult.isValid && edgeCaseResult.isValid;
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  return {
    allPassed,
    results: {
      mapping: mappingResult,
      sampleData: formDataResult,
      invalidData: invalidResult,
      edgeCases: edgeCaseResult
    }
  };
}

// Export for use in other files
export { runValidationTests };

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runValidationTests();
}

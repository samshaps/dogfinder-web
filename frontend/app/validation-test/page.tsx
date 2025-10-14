'use client';

import { useEffect, useState } from 'react';
import { validateFormToApiMapping, validateFormData, getExpectedApiPayload, logValidationResults } from '@/lib/validation/preferences-mapping';

export default function ValidationTestPage() {
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runValidationTests = () => {
    setIsRunning(true);
    console.clear();
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
      temperament: ['intelligent', 'friendly'],
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

    // Summary
    console.log('\n📊 Validation Summary:');
    console.log(`✅ Form-to-API Mapping: ${mappingResult.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Sample Form Data: ${formDataResult.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Invalid Data Detection: ${!invalidResult.isValid ? 'PASS' : 'FAIL'}`);

    const allPassed = mappingResult.isValid && formDataResult.isValid && !invalidResult.isValid;
    console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    setValidationResults({
      allPassed,
      mapping: mappingResult,
      sampleData: formDataResult,
      invalidData: invalidResult,
      expectedPayload
    });
    setIsRunning(false);
  };

  useEffect(() => {
    runValidationTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Form-to-API Validation Tests
          </h1>
          
          <div className="mb-6">
            <button
              onClick={runValidationTests}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {isRunning ? 'Running Tests...' : 'Run Validation Tests'}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Check the browser console for detailed test results
            </p>
          </div>

          {validationResults && (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg ${validationResults.allPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h2 className={`text-lg font-semibold ${validationResults.allPassed ? 'text-green-800' : 'text-red-800'}`}>
                  {validationResults.allPassed ? '✅ All Tests Passed' : '❌ Some Tests Failed'}
                </h2>
                <p className={`text-sm ${validationResults.allPassed ? 'text-green-600' : 'text-red-600'}`}>
                  {validationResults.allPassed 
                    ? 'All form inputs properly map to API schema' 
                    : 'There are validation issues that need to be addressed'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Form-to-API Mapping</h3>
                  <p className={`text-sm ${validationResults.mapping.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResults.mapping.isValid ? '✅ PASS' : '❌ FAIL'}
                  </p>
                  {validationResults.mapping.errors.length > 0 && (
                    <ul className="text-xs text-red-600 mt-2">
                      {validationResults.mapping.errors.map((error: string, i: number) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Sample Form Data</h3>
                  <p className={`text-sm ${validationResults.sampleData.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResults.sampleData.isValid ? '✅ PASS' : '❌ FAIL'}
                  </p>
                  {validationResults.sampleData.errors.length > 0 && (
                    <ul className="text-xs text-red-600 mt-2">
                      {validationResults.sampleData.errors.map((error: string, i: number) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Invalid Data Detection</h3>
                  <p className={`text-sm ${!validationResults.invalidData.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {!validationResults.invalidData.isValid ? '✅ PASS' : '❌ FAIL'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Should detect invalid data and reject it
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">API Payload</h3>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(validationResults.expectedPayload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

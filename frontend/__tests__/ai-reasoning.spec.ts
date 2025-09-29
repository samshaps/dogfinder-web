// AI Reasoning Test Suite - Validates AI responses against expected scenarios

import { generateTopPickReasoning, generateAllMatchReasoning } from '@/lib/ai-service';
import { buildAnalysis, Dog, UserPreferences } from '@/utils/matching';

// Test dog factory
const createTestDog = (overrides: Partial<Dog> = {}): Dog => ({
  id: 'test-dog-1',
  name: 'Test Dog',
  breeds: ['Mixed Breed'],
  age: 'Adult',
  size: 'Medium',
  gender: 'Male',
  photos: ['https://example.com/photo1.jpg'],
  publishedAt: new Date().toISOString(),
  location: { city: 'Brooklyn', state: 'NY', distanceMi: 5 },
  tags: ['affectionate'],
  url: 'https://example.com/dog/1',
  shelter: { name: 'Test Shelter', email: 'test@example.com', phone: '555-1234' },
  ...overrides
});

// Test scenarios
const testScenarios = [
  {
    name: 'Brooklyn Family - Perfect Match',
    userPreferences: {
      age: ['Young', 'Adult'],
      size: ['Small', 'Medium'],
      energy: 'low',
      temperament: ['good with kids', 'affectionate', 'easy to train'],
      guidance: 'We live in a Brooklyn apartment with two kids under 6. We want a dog that\'s affectionate, family-friendly, and can handle apartment life. We\'re fine with either a young dog (trainable and playful) or an adult dog (calmer and house-trained). We prefer low to medium exercise needs and small to medium size for city living.'
    } as UserPreferences,
    dog: createTestDog({
      name: 'Buddy',
      age: 'Adult',
      size: 'Medium',
      tags: ['affectionate', 'good with kids', 'house trained', 'calm']
    }),
    expectedMatches: ['age', 'size', 'temperament'],
    expectedConcerns: [],
    description: 'Adult medium dog with family-friendly traits should match perfectly'
  },
  {
    name: 'OR Logic - Age Match (Young OR Adult)',
    userPreferences: {
      age: ['Young', 'Adult'],
      size: ['Medium'],
      temperament: ['affectionate']
    } as UserPreferences,
    dog: createTestDog({
      name: 'Young Dog',
      age: 'Young',
      size: 'Medium',
      tags: ['affectionate', 'playful']
    }),
    expectedMatches: ['age', 'size', 'temperament'],
    expectedConcerns: [],
    description: 'Young dog should match when user selected Young OR Adult'
  },
  {
    name: 'OR Logic - Age Mismatch (Senior not in Young OR Adult)',
    userPreferences: {
      age: ['Young', 'Adult'],
      size: ['Medium'],
      temperament: ['affectionate']
    } as UserPreferences,
    dog: createTestDog({
      name: 'Senior Dog',
      age: 'Senior',
      size: 'Medium',
      tags: ['affectionate', 'calm']
    }),
    expectedMatches: ['size', 'temperament'],
    expectedConcerns: ['age'],
    description: 'Senior dog should be flagged as age mismatch when user wants Young OR Adult'
  },
  {
    name: 'Hypoallergenic - True Match',
    userPreferences: {
      age: ['Adult'],
      temperament: ['hypoallergenic'],
      guidance: 'I have allergies and need a hypoallergenic dog.'
    } as UserPreferences,
    dog: createTestDog({
      name: 'Poodle',
      breeds: ['Poodle'],
      age: 'Adult',
      tags: ['hypoallergenic', 'intelligent']
    }),
    expectedMatches: ['age', 'temperament'],
    expectedConcerns: [],
    description: 'Poodle should match hypoallergenic preference'
  },
  {
    name: 'Hypoallergenic - False Match (Should Flag)',
    userPreferences: {
      age: ['Adult'],
      temperament: ['hypoallergenic'],
      guidance: 'I have allergies and need a hypoallergenic dog.'
    } as UserPreferences,
    dog: createTestDog({
      name: 'Golden',
      breeds: ['Golden Retriever'],
      age: 'Adult',
      tags: ['affectionate', 'good with kids']
    }),
    expectedMatches: ['age'],
    expectedConcerns: ['temperament'],
    description: 'Golden Retriever should be flagged as not hypoallergenic'
  },
  {
    name: 'High Energy Match',
    userPreferences: {
      age: ['Young'],
      energy: 'high',
      guidance: 'I\'m an active runner and want a dog that can keep up.'
    } as UserPreferences,
    dog: createTestDog({
      name: 'Runner',
      breeds: ['Border Collie'],
      age: 'Young',
      tags: ['energetic', 'intelligent']
    }),
    expectedMatches: ['age', 'energy'],
    expectedConcerns: [],
    description: 'Young Border Collie should match high energy preference'
  },
  {
    name: 'Low Energy Mismatch (Puppy)',
    userPreferences: {
      age: ['Adult'],
      energy: 'low',
      guidance: 'I\'m retired and want a calm, low-maintenance dog.'
    } as UserPreferences,
    dog: createTestDog({
      name: 'Puppy',
      age: 'Baby',
      tags: ['playful', 'energetic']
    }),
    expectedMatches: [],
    expectedConcerns: ['age', 'energy'],
    description: 'Baby dog should be flagged as high energy mismatch for retired person'
  }
];

// Validation functions
function validateReasoning(reasoning: any, scenario: any) {
  const issues: string[] = [];
  
  // Check primary reason exists and length
  if (!reasoning.primary || reasoning.primary.length > 150) {
    issues.push(`Primary reason missing or too long (${reasoning.primary?.length || 0} chars)`);
  }
  
  // Check if primary mentions user preferences by name
  const primaryText = reasoning.primary?.toLowerCase() || '';
  const mentionsPreferences = scenario.userPreferences.temperament?.some((t: string) => 
    primaryText.includes(t.toLowerCase()) || primaryText.includes('preference') || primaryText.includes('your')
  ) || scenario.userPreferences.size?.some((s: string) => 
    primaryText.includes(s.toLowerCase()) || primaryText.includes('preference') || primaryText.includes('your')
  ) || scenario.userPreferences.age?.some((a: string) => 
    primaryText.includes(a.toLowerCase()) || primaryText.includes('preference') || primaryText.includes('your')
  ) || (scenario.userPreferences.energy && (
    primaryText.includes(scenario.userPreferences.energy.toLowerCase()) || 
    primaryText.includes('preference') || 
    primaryText.includes('your')
  ));
  
  if (!mentionsPreferences) {
    issues.push('Primary reason does not mention user preferences by name');
  }
  
  // Check concerns match expected
  const expectedConcerns = scenario.expectedConcerns;
  const actualConcerns = reasoning.concerns || [];
  
  if (expectedConcerns.length === 0 && actualConcerns.length > 0) {
    issues.push(`Unexpected concerns: ${actualConcerns.join(', ')}`);
  }
  
  if (expectedConcerns.length > 0 && actualConcerns.length === 0) {
    issues.push(`Missing expected concerns for: ${expectedConcerns.join(', ')}`);
  }
  
  // Check for false hypoallergenic claims
  if (primaryText.includes('hypoallergenic') && 
      !scenario.userPreferences.temperament?.includes('hypoallergenic')) {
    issues.push('False hypoallergenic claim');
  }
  
  return issues;
}

function validateAnalysis(analysis: any, scenario: any) {
  const issues: string[] = [];
  
  // Check expected matches
  const expectedMatches = scenario.expectedMatches;
  const actualMatches = analysis.matchedPrefs?.map((p: any) => p.key) || [];
  
  for (const expectedMatch of expectedMatches) {
    if (!actualMatches.includes(expectedMatch)) {
      issues.push(`Missing expected match: ${expectedMatch}`);
    }
  }
  
  // Check expected concerns
  const expectedConcerns = scenario.expectedConcerns;
  const actualConcerns = analysis.unmetPrefs?.map((p: any) => p.key) || [];
  
  for (const expectedConcern of expectedConcerns) {
    if (!actualConcerns.includes(expectedConcern)) {
      issues.push(`Missing expected concern: ${expectedConcern}`);
    }
  }
  
  return issues;
}

// Main test runner
export async function runAIReasoningTests() {
  console.log('🧪 Starting AI Reasoning Tests...\n');
  
  let passedTests = 0;
  let totalTests = testScenarios.length;
  const results: any[] = [];
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    
    try {
      // Build analysis
      const analysis = buildAnalysis(scenario.dog, scenario.userPreferences);
      console.log(`🎯 Analysis Score: ${analysis.score}`);
      console.log(`✅ Matched Prefs: ${analysis.matchedPrefs.map(p => `${p.key}:${p.label}`).join(', ')}`);
      console.log(`❌ Unmet Prefs: ${analysis.unmetPrefs.map(p => `${p.key}:${p.label}`).join(', ')}`);
      
      // Generate AI reasoning
      const topPickReasoning = await generateTopPickReasoning(
        scenario.dog, 
        scenario.userPreferences, 
        analysis
      );
      
      const allMatchReasoning = await generateAllMatchReasoning(
        scenario.dog, 
        scenario.userPreferences, 
        analysis
      );
      
      // Validate results
      const analysisIssues = validateAnalysis(analysis, scenario);
      const reasoningIssues = validateReasoning(topPickReasoning, scenario);
      
      const testResult = {
        name: scenario.name,
        passed: analysisIssues.length === 0 && reasoningIssues.length === 0,
        analysisIssues,
        reasoningIssues,
        analysis,
        topPickReasoning,
        allMatchReasoning
      };
      
      results.push(testResult);
      
      if (testResult.passed) {
        console.log('✅ PASSED');
        passedTests++;
      } else {
        console.log('❌ FAILED');
        if (analysisIssues.length > 0) {
          console.log('   Analysis issues:', analysisIssues.join(', '));
        }
        if (reasoningIssues.length > 0) {
          console.log('   Reasoning issues:', reasoningIssues.join(', '));
        }
      }
      
      console.log(`   Primary: "${topPickReasoning.primary}"`);
      console.log(`   All Match: "${allMatchReasoning}"`);
      
    } catch (error) {
      console.log('❌ FAILED - Error:', error);
      results.push({
        name: scenario.name,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
  }
  
  return { passedTests, totalTests, results };
}

// Export test scenarios for individual testing
export { testScenarios, validateReasoning, validateAnalysis };

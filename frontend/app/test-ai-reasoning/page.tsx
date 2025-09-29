'use client';

import { useState } from 'react';
import { runAIReasoningTests } from '@/__tests__/ai-reasoning.spec';

export default function TestAIReasoningPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await runAIReasoningTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
      setTestResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Reasoning Tests</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Suite</h2>
          <p className="text-gray-600 mb-4">
            This test suite validates AI reasoning against expected scenarios including:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
            <li>Brooklyn family scenario (apartment living, kids, family-friendly)</li>
            <li>OR logic for age preferences (Young OR Adult)</li>
            <li>Hypoallergenic matching (true and false cases)</li>
            <li>Energy level matching (high/low energy scenarios)</li>
            <li>Mismatch detection and concern flagging</li>
          </ul>
          
          <button
            onClick={runTests}
            disabled={isRunning}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Tests...' : 'Run AI Reasoning Tests'}
          </button>
        </div>

        {testResults && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            {testResults.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error: {testResults.error}</p>
              </div>
            ) : (
              <>
                <div className={`p-4 rounded-lg mb-6 ${
                  testResults.passedTests === testResults.totalTests 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`font-semibold ${
                    testResults.passedTests === testResults.totalTests 
                      ? 'text-green-800' 
                      : 'text-yellow-800'
                  }`}>
                    {testResults.passedTests === testResults.totalTests ? '🎉' : '⚠️'} 
                    {' '}{testResults.passedTests}/{testResults.totalTests} tests passed
                  </p>
                </div>

                <div className="space-y-4">
                  {testResults.results?.map((result: any, index: number) => (
                    <div key={index} className={`border rounded-lg p-4 ${
                      result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{result.name}</h3>
                        <span className={`px-2 py-1 rounded text-sm ${
                          result.passed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.passed ? '✅ PASSED' : '❌ FAILED'}
                        </span>
                      </div>
                      
                      {result.error && (
                        <p className="text-red-600 mb-2">Error: {result.error}</p>
                      )}
                      
                      {result.analysisIssues?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-red-600 font-medium">Analysis Issues:</p>
                          <ul className="list-disc list-inside text-red-600 text-sm">
                            {result.analysisIssues.map((issue: string, i: number) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.reasoningIssues?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-red-600 font-medium">Reasoning Issues:</p>
                          <ul className="list-disc list-inside text-red-600 text-sm">
                            {result.reasoningIssues.map((issue: string, i: number) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.topPickReasoning && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="font-medium text-sm text-gray-700">AI Primary Reasoning:</p>
                          <p className="text-sm text-gray-900">"{result.topPickReasoning.primary}"</p>
                          {result.topPickReasoning.concerns?.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium text-sm text-gray-700">Concerns:</p>
                              <ul className="list-disc list-inside text-sm text-gray-900">
                                {result.topPickReasoning.concerns.map((concern: string, i: number) => (
                                  <li key={i}>{concern}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

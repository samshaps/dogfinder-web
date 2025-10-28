#!/usr/bin/env node

/**
 * Benchmark script to measure OpenAI API response times
 * Tests various scenarios to determine optimal timeout value
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const TEST_SCENARIOS = [
  {
    name: 'Short free-form prompt (50 tokens)',
    params: {
      prompt: 'Write a brief reason why a Golden Retriever is a good match for someone who likes hiking.',
      type: 'free',
      max_tokens: 50,
      temperature: 0.1
    }
  },
  {
    name: 'Medium free-form prompt (80 tokens)',
    params: {
      prompt: 'Explain why a 3-year-old medium-sized Golden Retriever mix with high energy and friendly temperament would be a great match for an active family with a large yard who enjoys hiking and wants a dog that gets along with children.',
      type: 'free',
      max_tokens: 80,
      temperature: 0.1
    }
  },
  {
    name: 'Long free-form prompt (150 tokens)',
    params: {
      prompt: 'Write a detailed explanation (around 150 words) for why a young adult Golden Retriever mix would be perfect for an active owner who: enjoys daily hiking and running, has a large fenced yard, wants a dog that is friendly with children and other dogs, prefers medium to large breeds, and values a dog with high energy that can keep up with an active lifestyle. Include specific mentions of how the dog matches each preference.',
      type: 'free',
      max_tokens: 150,
      temperature: 0.1
    }
  },
  {
    name: 'Top-pick structured response',
    params: {
      prompt: 'Analyze why this dog is a good match: Name: Rolo, Breed: Golden Retriever, Age: 3 years, Size: Large, Energy: High, Temperament: Friendly, Playful, Good with kids. User preferences: Active lifestyle, large yard, enjoys hiking, wants family-friendly dog.',
      type: 'top-pick',
      max_tokens: 150,
      temperature: 0.1
    }
  },
  {
    name: 'Complex prompt with multiple preferences',
    params: {
      prompt: 'Generate a match explanation for a 2-year-old Labrador Retriever. User has specified: prefers medium energy level, needs a quiet dog for apartment living, wants low-shedding breed, prefers young dogs (under 5 years), and values good with cats. Note: This dog has high energy and heavy shedding, but is very friendly and trainable.',
      type: 'free',
      max_tokens: 100,
      temperature: 0.2
    }
  },
  {
    name: 'Minimal preferences prompt',
    params: {
      prompt: 'Briefly explain why any dog could be a good match. Limited preferences provided.',
      type: 'free',
      max_tokens: 60,
      temperature: 0.1
    }
  },
  {
    name: 'High temperature (more creative)',
    params: {
      prompt: 'Write an engaging explanation for why a mixed breed rescue dog is special and could be a great companion.',
      type: 'free',
      max_tokens: 80,
      temperature: 0.5
    }
  },
  {
    name: 'Very short response (30 tokens)',
    params: {
      prompt: 'One sentence: Why is this dog a good match?',
      type: 'free',
      max_tokens: 30,
      temperature: 0.1
    }
  },
];

async function callOpenAI(params) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s max for benchmark
    
    const response = await fetch(`${BASE_URL}/api/ai-reasoning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - start;
    
    // Extract response length
    let responseLength = 0;
    if (params.type === 'top-pick' && data.reasoning?.primary) {
      responseLength = data.reasoning.primary.length;
    } else if (typeof data.reasoning === 'string') {
      responseLength = data.reasoning.length;
    }
    
    return {
      success: true,
      duration,
      responseLength,
      hasContent: responseLength > 0,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      success: false,
      duration,
      error: error.message,
    };
  }
}

function calculateStats(results) {
  const durations = results.filter(r => r.success).map(r => r.duration);
  if (durations.length === 0) {
    return { count: 0, successCount: 0, failureCount: results.length };
  }
  
  durations.sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = sum / durations.length;
  const min = durations[0];
  const max = durations[durations.length - 1];
  const median = durations[Math.floor(durations.length / 2)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  
  const responseLengths = results.filter(r => r.success && r.responseLength > 0).map(r => r.responseLength);
  const avgResponseLength = responseLengths.length > 0
    ? Math.round(responseLengths.reduce((a, b) => a + b, 0) / responseLengths.length)
    : 0;
  
  return {
    count: results.length,
    successCount: durations.length,
    failureCount: results.length - durations.length,
    min,
    max,
    avg: Math.round(avg),
    median,
    p95,
    p99,
    avgResponseLength,
    allDurations: durations,
  };
}

async function runBenchmark() {
  console.log('🤖 OpenAI API Response Time Benchmark\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log(`Running ${TEST_SCENARIOS.length} test scenarios...\n`);
  console.log('='.repeat(80));
  
  const allResults = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`   Type: ${scenario.params.type}, Max tokens: ${scenario.params.max_tokens}, Temp: ${scenario.params.temperature}`);
    
    // Run each scenario 5 times
    const scenarioResults = [];
    for (let i = 0; i < 5; i++) {
      process.stdout.write(`   Run ${i + 1}/5... `);
      const result = await callOpenAI(scenario.params);
      scenarioResults.push(result);
      
      if (result.success) {
        const lengthInfo = result.responseLength > 0 ? ` (${result.responseLength} chars)` : '';
        console.log(`✅ ${result.duration}ms${lengthInfo}`);
      } else {
        console.log(`❌ ${result.duration}ms - ${result.error}`);
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const stats = calculateStats(scenarioResults);
    console.log(`   Stats: ${stats.successCount}/5 successful, avg: ${stats.avg}ms, min: ${stats.min}ms, max: ${stats.max}ms`);
    if (stats.avgResponseLength > 0) {
      console.log(`   Avg response length: ${stats.avgResponseLength} characters`);
    }
    
    allResults.push(...scenarioResults);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 OVERALL STATISTICS\n');
  
  const overallStats = calculateStats(allResults);
  console.log(`Total requests: ${overallStats.count}`);
  console.log(`Successful: ${overallStats.successCount}`);
  console.log(`Failed: ${overallStats.failureCount}`);
  console.log(`Success rate: ${Math.round((overallStats.successCount / overallStats.count) * 100)}%`);
  
  if (overallStats.successCount > 0) {
    console.log(`\nTiming statistics (ms):`);
    console.log(`  Minimum:  ${overallStats.min}ms`);
    console.log(`  Maximum:  ${overallStats.max}ms`);
    console.log(`  Average:  ${overallStats.avg}ms`);
    console.log(`  Median:   ${overallStats.median}ms`);
    console.log(`  95th %ile: ${overallStats.p95}ms`);
    console.log(`  99th %ile: ${overallStats.p99}ms`);
    
    if (overallStats.avgResponseLength > 0) {
      console.log(`\nAverage response length: ${overallStats.avgResponseLength} characters`);
    }
    
    console.log(`\n💡 Recommended timeout values:`);
    console.log(`  Conservative (p95): ${overallStats.p95}ms (~${Math.ceil(overallStats.p95 / 1000)}s)`);
    console.log(`  Standard (p99):    ${overallStats.p99}ms (~${Math.ceil(overallStats.p99 / 1000)}s)`);
    console.log(`  Generous (max):    ${overallStats.max}ms (~${Math.ceil(overallStats.max / 1000)}s)`);
    console.log(`  With buffer:       ${Math.round(overallStats.p95 * 1.5)}ms (~${Math.ceil(overallStats.p95 * 1.5 / 1000)}s)`);
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run the benchmark
runBenchmark().catch(error => {
  console.error('\n❌ Benchmark failed:', error);
  process.exit(1);
});


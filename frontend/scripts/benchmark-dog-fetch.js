#!/usr/bin/env node

/**
 * Benchmark script to measure dog API fetch times
 * Tests various scenarios to determine optimal timeout value
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const TEST_SCENARIOS = [
  {
    name: 'Single zip code, no filters',
    params: { zip: '10001', radius: 50, limit: 5, sort: 'freshness' }
  },
  {
    name: 'Single zip code, with age filter',
    params: { zip: '10001', radius: 50, limit: 5, sort: 'freshness', age: 'young,adult' }
  },
  {
    name: 'Single zip code, with size filter',
    params: { zip: '10001', radius: 50, limit: 5, sort: 'freshness', size: 'medium,large' }
  },
  {
    name: 'Single zip code, with breed filter',
    params: { zip: '10001', radius: 50, limit: 5, sort: 'freshness', breed: 'Golden Retriever' }
  },
  {
    name: 'Single zip code, multiple filters',
    params: { zip: '10001', radius: 50, limit: 5, sort: 'freshness', age: 'young', size: 'medium', energy: 'medium' }
  },
  {
    name: 'Different zip (90210)',
    params: { zip: '90210', radius: 50, limit: 5, sort: 'freshness' }
  },
  {
    name: 'Different zip (60601)',
    params: { zip: '60601', radius: 50, limit: 5, sort: 'freshness' }
  },
  {
    name: 'Smaller radius',
    params: { zip: '10001', radius: 25, limit: 5, sort: 'freshness' }
  },
  {
    name: 'Larger radius',
    params: { zip: '10001', radius: 100, limit: 5, sort: 'freshness' }
  },
];

async function fetchDogs(params) {
  const url = new URL(`${BASE_URL}/api/dogs`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s max for benchmark
    
    const response = await fetch(url.toString(), {
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - start;
    
    return {
      success: true,
      duration,
      itemCount: data.items?.length || 0,
      total: data.total || 0,
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
    allDurations: durations,
  };
}

async function runBenchmark() {
  console.log('🐕 Dog API Fetch Benchmark\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log(`Running ${TEST_SCENARIOS.length} test scenarios...\n`);
  console.log('=' .repeat(80));
  
  const allResults = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`   Params: ${JSON.stringify(scenario.params)}`);
    
    // Run each scenario 5 times
    const scenarioResults = [];
    for (let i = 0; i < 5; i++) {
      process.stdout.write(`   Run ${i + 1}/5... `);
      const result = await fetchDogs(scenario.params);
      scenarioResults.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.duration}ms (${result.itemCount} items, ${result.total} total)`);
      } else {
        console.log(`❌ ${result.duration}ms - ${result.error}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const stats = calculateStats(scenarioResults);
    console.log(`   Stats: ${stats.successCount}/5 successful, avg: ${stats.avg}ms, min: ${stats.min}ms, max: ${stats.max}ms`);
    
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


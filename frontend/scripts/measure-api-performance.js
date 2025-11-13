#!/usr/bin/env node

/**
 * Performance Measurement Script
 * 
 * Measures API call performance for results page flow with guidance.
 * Calls the same API endpoints that the frontend calls and logs timings.
 * 
 * Usage:
 *   node scripts/measure-api-performance.js [iterations] [guidance-text]
 * 
 * Example:
 *   node scripts/measure-api-performance.js 10 "we live in a small apartment with no yard"
 */

const BASE_URL = process.env.STAGING_URL || 'https://staging.dogyenta.com';

// Test parameters matching the URL you provided
const TEST_PARAMS = {
  zip: '11211',
  radius: 50,
  age: 'baby,young',
  size: 'medium',
  temperament: 'focused,playful',
  energy: 'high',
  guidance: process.argv[3] || 'we live in a small apartment with no yard',
  t_age: '1',
  t_size: '1',
  t_energy: '1',
  t_temperament: '1'
};

const ITERATIONS = parseInt(process.argv[2]) || 5;

// Helper to calculate percentiles
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Helper to format stats
function stats(arr) {
  if (arr.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  return {
    min: Math.min(...arr),
    max: Math.max(...arr),
    avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    p50: percentile(arr, 50),
    p95: percentile(arr, 95),
    p99: percentile(arr, 99),
    count: arr.length
  };
}

// Measure a single API call
async function measureApiCall(name, url, options = {}) {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const duration = Date.now() - startTime;
    const status = response.status;
    
    // Try to get performance headers if available
    const backendDuration = response.headers.get('X-Backend-Duration');
    const totalDuration = response.headers.get('X-Total-Duration');
    const requestId = response.headers.get('X-Request-ID');
    
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // Not JSON, that's ok
    }
    
    return {
      name,
      duration,
      status,
      success: response.ok,
      backendDuration: backendDuration ? parseInt(backendDuration) : null,
      totalDuration: totalDuration ? parseInt(totalDuration) : null,
      requestId,
      dataSize: data ? JSON.stringify(data).length : 0,
      error: response.ok ? null : `HTTP ${status}`
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name,
      duration,
      status: 0,
      success: false,
      error: error.message,
      backendDuration: null,
      totalDuration: null,
      requestId: null,
      dataSize: 0
    };
  }
}

// Build query string
function buildQueryString(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, value.toString());
    }
  });
  return searchParams.toString();
}

// Main measurement function
async function measureResultsPageFlow() {
  console.log(`\n📊 Measuring API Performance`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Guidance: "${TEST_PARAMS.guidance}"`);
  console.log(`\n`);

  const allMeasurements = {
    '/api/dogs': [],
    '/api/match-dogs': [],
    '/api/ai-reasoning': []
  };

  for (let i = 0; i < ITERATIONS; i++) {
    console.log(`\n🔄 Iteration ${i + 1}/${ITERATIONS}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Step 1: Fetch dogs
    console.log(`\n1️⃣  Calling /api/dogs...`);
    const qs = buildQueryString(TEST_PARAMS);
    const dogsUrl = `${BASE_URL}/api/dogs?${qs}`;
    const dogsResult = await measureApiCall('GET /api/dogs', dogsUrl);
    allMeasurements['/api/dogs'].push(dogsResult.duration);
    console.log(`   Duration: ${dogsResult.duration}ms`);
    if (dogsResult.backendDuration) {
      console.log(`   Backend: ${dogsResult.backendDuration}ms`);
    }
    if (dogsResult.error) {
      console.log(`   ❌ Error: ${dogsResult.error}`);
      continue;
    }
    if (!dogsResult.success) {
      console.log(`   ❌ Failed: HTTP ${dogsResult.status}`);
      continue;
    }

    const dogs = dogsResult.data?.items || [];
    const dogsWithPhotos = dogs.filter(d => d.photos && d.photos.length > 0);
    console.log(`   ✅ Received ${dogs.length} dogs (${dogsWithPhotos.length} with photos)`);

    if (dogsWithPhotos.length === 0) {
      console.log(`   ⚠️  No dogs with photos, skipping matching step`);
      continue;
    }

    // Step 2: Match dogs (only if we have dogs)
    console.log(`\n2️⃣  Calling /api/match-dogs...`);
    const userPreferences = {
      zipCodes: [TEST_PARAMS.zip],
      radiusMi: parseInt(TEST_PARAMS.radius),
      age: TEST_PARAMS.age?.split(','),
      size: TEST_PARAMS.size?.split(','),
      energy: TEST_PARAMS.energy,
      temperament: TEST_PARAMS.temperament?.split(','),
      guidance: TEST_PARAMS.guidance,
      touched: {
        age: TEST_PARAMS.t_age === '1',
        size: TEST_PARAMS.t_size === '1',
        energy: TEST_PARAMS.t_energy === '1',
        temperament: TEST_PARAMS.t_temperament === '1'
      }
    };

    // Transform API dogs to matching format
    const transformedDogs = dogsWithPhotos.slice(0, 20).map(dog => ({
      id: dog.id,
      name: dog.name,
      breeds: dog.breeds,
      age: dog.age?.toLowerCase(),
      size: dog.size?.toLowerCase(),
      energy: dog.tags?.includes('high energy') ? 'high' : 
              dog.tags?.includes('low energy') ? 'low' : 'medium',
      temperament: dog.tags?.filter(t => 
        ['affectionate', 'playful', 'calm', 'quiet'].includes(t.toLowerCase())
      ) || [],
      location: { zip: `${dog.location.city}, ${dog.location.state}`, distanceMi: dog.location.distanceMi },
      photos: dog.photos,
      tags: dog.tags || []
    }));

    const matchUrl = `${BASE_URL}/api/match-dogs`;
    const matchResult = await measureApiCall('POST /api/match-dogs', matchUrl, {
      method: 'POST',
      body: JSON.stringify({
        userPreferences,
        dogs: transformedDogs
      })
    });
    allMeasurements['/api/match-dogs'].push(matchResult.duration);
    console.log(`   Duration: ${matchResult.duration}ms`);
    if (matchResult.totalDuration) {
      console.log(`   Total (from header): ${matchResult.totalDuration}ms`);
    }
    if (matchResult.error) {
      console.log(`   ❌ Error: ${matchResult.error}`);
    } else if (matchResult.success) {
      const topMatches = matchResult.data?.results?.topMatches?.length || 0;
      console.log(`   ✅ Matched ${topMatches} top picks`);
    }

    // Step 3: Measure AI reasoning calls (simulate 3 parallel calls for top matches)
    if (matchResult.success && matchResult.data?.results?.topMatches?.length > 0) {
      console.log(`\n3️⃣  Calling /api/ai-reasoning (3 parallel calls)...`);
      const top3 = matchResult.data.results.topMatches.slice(0, 3);
      const reasoningCalls = await Promise.all(
        top3.map((_, idx) => {
          const prompt = `Write one sentence about why this dog matches the user's preferences.`;
          return measureApiCall(`POST /api/ai-reasoning (${idx + 1})`, `${BASE_URL}/api/ai-reasoning`, {
            method: 'POST',
            body: JSON.stringify({
              prompt,
              type: 'free',
              max_tokens: 50,
              temperature: 0.1
            })
          });
        })
      );

      reasoningCalls.forEach((result, idx) => {
        allMeasurements['/api/ai-reasoning'].push(result.duration);
        console.log(`   Call ${idx + 1} duration: ${result.duration}ms`);
        if (result.totalDuration) {
          console.log(`   Call ${idx + 1} total (from header): ${result.totalDuration}ms`);
        }
      });
    }

    // Wait a bit between iterations to avoid rate limiting
    if (i < ITERATIONS - 1) {
      console.log(`\n   ⏳ Waiting 2s before next iteration...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary statistics
  console.log(`\n\n📈 Performance Summary`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  Object.entries(allMeasurements).forEach(([endpoint, durations]) => {
    if (durations.length === 0) {
      console.log(`${endpoint}: No successful calls`);
      return;
    }
    const s = stats(durations);
    console.log(`${endpoint}:`);
    console.log(`  Count:    ${s.count}`);
    console.log(`  Min:      ${s.min.toFixed(0)}ms`);
    console.log(`  Max:      ${s.max.toFixed(0)}ms`);
    console.log(`  Average:  ${s.avg.toFixed(0)}ms`);
    console.log(`  P50:      ${s.p50.toFixed(0)}ms`);
    console.log(`  P95:      ${s.p95.toFixed(0)}ms ⭐`);
    console.log(`  P99:      ${s.p99.toFixed(0)}ms`);
    console.log(``);
  });

  // Calculate total page load time estimate
  const avgDogs = allMeasurements['/api/dogs'].length > 0 ? 
    stats(allMeasurements['/api/dogs']).avg : 0;
  const avgMatch = allMeasurements['/api/match-dogs'].length > 0 ? 
    stats(allMeasurements['/api/match-dogs']).avg : 0;
  const avgReasoning = allMeasurements['/api/ai-reasoning'].length > 0 ? 
    stats(allMeasurements['/api/ai-reasoning']).avg : 0;

  console.log(`📊 Estimated Total Page Load Time:`);
  console.log(`  Sequential (dogs → match):        ${(avgDogs + avgMatch).toFixed(0)}ms`);
  console.log(`  Parallel (match + reasoning):     ${Math.max(avgMatch, avgReasoning).toFixed(0)}ms`);
  console.log(`  Total (dogs + max(match, reason)): ${(avgDogs + Math.max(avgMatch, avgReasoning)).toFixed(0)}ms`);
  console.log(`\n`);
}

// Run the measurement
measureResultsPageFlow().catch(error => {
  console.error('❌ Measurement failed:', error);
  process.exit(1);
});


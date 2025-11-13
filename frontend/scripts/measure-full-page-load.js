#!/usr/bin/env node

/**
 * Full Page Load Performance Investigation
 * 
 * Simulates the exact flow that happens when a user loads the results page.
 * Measures ALL API calls, their sequence, timing, and dependencies.
 * 
 * Usage:
 *   node scripts/measure-full-page-load.js [guidance-text]
 * 
 * Example:
 *   node scripts/measure-full-page-load.js "we live in a small apartment with no yard"
 */

const BASE_URL = process.env.STAGING_URL || 'https://staging.dogyenta.com';

// Test parameters matching your URL
const TEST_PARAMS = {
  zip: '11211',
  radius: 50,
  age: 'baby,young',
  size: 'medium',
  temperament: 'focused,playful',
  energy: 'high',
  guidance: process.argv[2] || 'we live in a small apartment with no yard',
  t_age: '1',
  t_size: '1',
  t_energy: '1',
  t_temperament: '1',
  page: '1',
  limit: '20'
};

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

// Track all API calls
const apiCalls = [];

// Measure API call with detailed timing
async function measureApiCall(name, url, options = {}) {
  const startTime = Date.now();
  const callId = `${name}-${Date.now()}`;
  
  const timing = {
    name,
    url,
    callId,
    startTime,
    method: options.method || 'GET',
    hasGuidance: url.includes('guidance'),
  };
  
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
    
    // Get performance headers
    const backendDuration = response.headers.get('X-Backend-Duration');
    const totalDuration = response.headers.get('X-Total-Duration');
    const matchingDuration = response.headers.get('X-Matching-Duration');
    const openaiDuration = response.headers.get('X-OpenAI-Duration');
    const requestId = response.headers.get('X-Request-ID');
    
    let data = null;
    let dataSize = 0;
    try {
      const text = await response.text();
      dataSize = text.length;
      data = JSON.parse(text);
    } catch (e) {
      // Not JSON, that's ok
    }
    
    const dogCount = data?.items?.length || data?.results?.topMatches?.length || 0;
    
    Object.assign(timing, {
      duration,
      status,
      success: response.ok,
      backendDuration: backendDuration ? parseInt(backendDuration) : null,
      totalDuration: totalDuration ? parseInt(totalDuration) : null,
      matchingDuration: matchingDuration ? parseInt(matchingDuration) : null,
      openaiDuration: openaiDuration ? parseInt(openaiDuration) : null,
      requestId,
      dataSize,
      dogCount,
      error: response.ok ? null : `HTTP ${status}`,
      endTime: Date.now()
    });
    
    apiCalls.push(timing);
    return { success: response.ok, data, timing };
  } catch (error) {
    const duration = Date.now() - startTime;
    Object.assign(timing, {
      duration,
      status: 0,
      success: false,
      error: error.message,
      endTime: Date.now()
    });
    apiCalls.push(timing);
    return { success: false, error: error.message, timing };
  }
}

// Main measurement function
async function measureFullPageLoad(waitForColdStart = false) {
  console.log(`\n🔍 Full Page Load Performance Investigation`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Guidance: "${TEST_PARAMS.guidance}"`);
  console.log(`Cold Start Test: ${waitForColdStart ? 'YES (waiting 30s)' : 'NO'}`);
  console.log(`\n`);
  
  if (waitForColdStart) {
    console.log(`⏳ Waiting 30 seconds to ensure cold start...`);
    await new Promise(resolve => setTimeout(resolve, 30000));
    console.log(`✅ Starting measurement after cold period\n`);
  }

  const pageLoadStart = Date.now();
  
  // ============================================================
  // PHASE 1: Initial Page Load (what happens in useEffect)
  // ============================================================
  console.log(`📄 PHASE 1: Initial Page Load`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  // Step 1: Fetch dogs (this is what listDogs() does)
  console.log(`1️⃣  [SEQUENTIAL] Calling listDogs() → /api/dogs`);
  const qs = buildQueryString(TEST_PARAMS);
  const dogsUrl = `${BASE_URL}/api/dogs?${qs}`;
  const dogsResult = await measureApiCall('GET /api/dogs', dogsUrl);
  
  if (!dogsResult.success) {
    console.log(`   ❌ Failed: ${dogsResult.error}`);
    console.log(`   Cannot continue without dogs.`);
    return printSummary();
  }
  
  const dogs = dogsResult.data?.items || [];
  const dogsWithPhotos = dogs.filter(d => d.photos && d.photos.length > 0);
  
  console.log(`   ✅ Duration: ${dogsResult.timing.duration}ms`);
  if (dogsResult.timing.backendDuration) {
    console.log(`   📡 Backend: ${dogsResult.timing.backendDuration}ms`);
  }
  console.log(`   📊 Received: ${dogs.length} dogs (${dogsWithPhotos.length} with photos)`);
  console.log(`   📦 Data size: ${(dogsResult.timing.dataSize / 1024).toFixed(2)} KB`);
  console.log(``);
  
  if (dogsWithPhotos.length === 0) {
    console.log(`   ⚠️  No dogs with photos - skipping matching phase`);
    return printSummary();
  }
  
  // ============================================================
  // PHASE 2: AI Matching (happens after dogs load, non-blocking)
  // ============================================================
  console.log(`🤖 PHASE 2: AI Matching (starts after dogs load)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  // Build user preferences like the frontend does
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
  
  // Transform dogs like the frontend does
  const transformedDogs = dogsWithPhotos.slice(0, 20).map(dog => ({
    id: dog.id,
    name: dog.name,
    breeds: dog.breeds || [],
    age: dog.age?.toLowerCase(),
    size: dog.size?.toLowerCase(),
    energy: dog.tags?.includes('high energy') ? 'high' : 
            dog.tags?.includes('low energy') ? 'low' : 'medium',
    temperament: dog.tags?.filter(t => 
      ['affectionate', 'playful', 'calm', 'quiet', 'focused'].includes(t.toLowerCase())
    ) || [],
    location: { 
      zip: `${dog.location?.city || ''}, ${dog.location?.state || ''}`, 
      distanceMi: dog.location?.distanceMi || 0 
    },
    photos: dog.photos || [],
    tags: dog.tags || []
  }));
  
  // Step 2: Match dogs
  console.log(`2️⃣  [SEQUENTIAL] Calling /api/match-dogs`);
  const matchUrl = `${BASE_URL}/api/match-dogs`;
  const matchStart = Date.now();
  const matchResult = await measureApiCall('POST /api/match-dogs', matchUrl, {
    method: 'POST',
    body: JSON.stringify({
      userPreferences,
      dogs: transformedDogs
    })
  });
  
  if (!matchResult.success) {
    console.log(`   ❌ Failed: ${matchResult.error}`);
    return printSummary();
  }
  
  console.log(`   ✅ Duration: ${matchResult.timing.duration}ms`);
  if (matchResult.timing.matchingDuration) {
    console.log(`   🧠 Matching logic: ${matchResult.timing.matchingDuration}ms`);
  }
  const topMatches = matchResult.data?.results?.topMatches || [];
  console.log(`   📊 Top matches: ${topMatches.length}`);
  console.log(`   📊 All matches: ${matchResult.data?.results?.allMatches?.length || 0}`);
  console.log(``);
  
  // Step 3: AI Reasoning calls (happens inside processDogMatching, 3 parallel calls)
  console.log(`3️⃣  [PARALLEL] AI Reasoning calls (3 calls for top matches)`);
  const reasoningStart = Date.now();
  
  if (topMatches.length > 0) {
    const reasoningCalls = topMatches.slice(0, 3).map((match, idx) => {
      const prompt = `Write one sentence about why this dog matches the user's preferences.`;
      return measureApiCall(
        `POST /api/ai-reasoning (${idx + 1})`, 
        `${BASE_URL}/api/ai-reasoning`,
        {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            type: 'free',
            max_tokens: 50,
            temperature: 0.1
          })
        }
      );
    });
    
    const reasoningResults = await Promise.all(reasoningCalls);
    const reasoningDuration = Date.now() - reasoningStart;
    const maxReasoningTime = Math.max(...reasoningResults.map(r => r.timing.duration));
    
    reasoningResults.forEach((result, idx) => {
      console.log(`   Call ${idx + 1}: ${result.timing.duration}ms`);
      if (result.timing.openaiDuration) {
        console.log(`      └─ OpenAI: ${result.timing.openaiDuration}ms`);
      }
    });
    console.log(`   ⚡ Parallel max: ${maxReasoningTime}ms (total wall time: ${reasoningDuration}ms)`);
  }
  
  const pageLoadEnd = Date.now();
  const totalPageLoadTime = pageLoadEnd - pageLoadStart;
  
  console.log(`\n`);
  console.log(`⏱️  TOTAL PAGE LOAD TIME: ${totalPageLoadTime}ms (${(totalPageLoadTime/1000).toFixed(2)}s)`);
  console.log(`\n`);
  
  return printSummary();
}

// Print detailed summary
function printSummary() {
  console.log(`\n📈 Detailed Performance Summary`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  // Group by phase
  const phase1 = apiCalls.filter(c => c.name.includes('/api/dogs') && c.method === 'GET');
  const phase2 = apiCalls.filter(c => c.name.includes('/api/match-dogs'));
  const phase3 = apiCalls.filter(c => c.name.includes('/api/ai-reasoning'));
  
  console.log(`📊 API Call Breakdown:`);
  console.log(``);
  
  // Phase 1
  if (phase1.length > 0) {
    console.log(`PHASE 1: Initial Dog Fetch`);
    phase1.forEach(call => {
      console.log(`  ${call.name}`);
      console.log(`    Duration: ${call.duration}ms`);
      if (call.backendDuration) {
        console.log(`    Backend: ${call.backendDuration}ms (${((call.backendDuration / call.duration) * 100).toFixed(1)}%)`);
      }
      console.log(`    Has Guidance: ${call.hasGuidance}`);
      console.log(`    Data: ${(call.dataSize / 1024).toFixed(2)} KB`);
      console.log(``);
    });
  }
  
  // Phase 2
  if (phase2.length > 0) {
    console.log(`PHASE 2: AI Matching`);
    phase2.forEach(call => {
      console.log(`  ${call.name}`);
      console.log(`    Duration: ${call.duration}ms`);
      if (call.matchingDuration) {
        console.log(`    Matching Logic: ${call.matchingDuration}ms (${((call.matchingDuration / call.duration) * 100).toFixed(1)}%)`);
      }
      console.log(`    Data: ${(call.dataSize / 1024).toFixed(2)} KB`);
      console.log(``);
    });
  }
  
  // Phase 3
  if (phase3.length > 0) {
    console.log(`PHASE 3: AI Reasoning (${phase3.length} parallel calls)`);
    const parallelMax = Math.max(...phase3.map(c => c.duration));
    const parallelTotal = phase3.reduce((sum, c) => sum + c.duration, 0);
    const parallelWallTime = phase3[phase3.length - 1].endTime - phase3[0].startTime;
    
    phase3.forEach(call => {
      console.log(`  ${call.name}`);
      console.log(`    Duration: ${call.duration}ms`);
      if (call.openaiDuration) {
        console.log(`    OpenAI: ${call.openaiDuration}ms (${((call.openaiDuration / call.duration) * 100).toFixed(1)}%)`);
      }
      console.log(``);
    });
    console.log(`  Parallel Performance:`);
    console.log(`    Sequential total (if sequential): ${parallelTotal}ms`);
    console.log(`    Parallel max (actual): ${parallelMax}ms`);
    console.log(`    Wall time: ${parallelWallTime}ms`);
    console.log(`    Speedup: ${(parallelTotal / parallelMax).toFixed(2)}x`);
    console.log(``);
  }
  
  // Timeline visualization
  console.log(`⏱️  Timeline Visualization:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const allCalls = [...phase1, ...phase2, ...phase3];
  const firstStart = Math.min(...allCalls.map(c => c.startTime));
  const lastEnd = Math.max(...allCalls.map(c => c.endTime));
  const totalSpan = lastEnd - firstStart;
  
  allCalls.forEach(call => {
    const offset = call.startTime - firstStart;
    const barLength = 50;
    const startPos = Math.floor((offset / totalSpan) * barLength);
    const durationPos = Math.max(1, Math.floor((call.duration / totalSpan) * barLength));
    
    const bar = ' '.repeat(startPos) + '█'.repeat(durationPos);
    const percentage = ((call.duration / totalSpan) * 100).toFixed(1);
    
    console.log(`${call.name.padEnd(35)} ${bar} ${call.duration}ms (${percentage}%)`);
  });
  
  console.log(``);
  console.log(`📊 Key Metrics:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const totalBackendTime = phase1.reduce((sum, c) => sum + (c.backendDuration || 0), 0);
  const totalMatchingTime = phase2.reduce((sum, c) => sum + (c.matchingDuration || 0), 0);
  const totalOpenAITime = phase3.reduce((sum, c) => sum + (c.openaiDuration || 0), 0);
  
  console.log(`Total Backend API Time: ${totalBackendTime}ms`);
  console.log(`Total Matching Logic Time: ${totalMatchingTime}ms`);
  console.log(`Total OpenAI Time: ${totalOpenAITime}ms (parallel, so actual is max)`);
  console.log(`Total Sequential Time: ${totalBackendTime + totalMatchingTime + Math.max(...phase3.map(c => c.openaiDuration || 0))}ms`);
  console.log(`Total Wall Time: ${lastEnd - firstStart}ms`);
  console.log(``);
  
  // Bottleneck analysis
  console.log(`🔍 Bottleneck Analysis:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const bottlenecks = [
    { name: '/api/dogs backend', time: totalBackendTime },
    { name: '/api/match-dogs matching', time: totalMatchingTime },
    { name: 'AI reasoning (parallel max)', time: Math.max(...phase3.map(c => c.openaiDuration || 0)) }
  ].sort((a, b) => b.time - a.time);
  
  bottlenecks.forEach((b, idx) => {
    const symbol = idx === 0 ? '🔥' : idx === 1 ? '⚡' : '📌';
    console.log(`${symbol} ${b.name}: ${b.time}ms`);
  });
  
  console.log(``);
}

// Run the measurement
const args = process.argv.slice(2);
const guidance = args.find(arg => !arg.startsWith('--')) || TEST_PARAMS.guidance;
const coldStart = args.includes('--cold-start');

if (guidance !== TEST_PARAMS.guidance) {
  TEST_PARAMS.guidance = guidance;
}

measureFullPageLoad(coldStart).catch(error => {
  console.error('❌ Measurement failed:', error);
  process.exit(1);
});


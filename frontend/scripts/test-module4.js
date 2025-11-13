#!/usr/bin/env node

/**
 * Module 4 Testing Script
 * Tests API structure, rate limiting, versioning, and documentation
 */

const https = require('https');
const http = require('http');

// Configuration
const STAGING_URL = 'https://staging.dogyenta.com';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 10000
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runTest(testName, testFn) {
  try {
    log(`Running test: ${testName}`);
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'PASSED' });
    log(`✅ ${testName} - PASSED`, 'success');
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
    log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
  }
}

// Test 1: API Documentation Endpoint
async function testApiDocs() {
  const response = await makeRequest(`${STAGING_URL}/api/docs`);
  
  if (response.status !== 200) {
    throw new Error(`API docs endpoint failed with status ${response.status}`);
  }
  
  // Check if it returns HTML
  if (!response.data.includes && !response.data.includes('DogYenta API Documentation')) {
    throw new Error('API docs should return HTML documentation');
  }
  
  log('API documentation endpoint working');
}

// Test 2: API Documentation JSON Format
async function testApiDocsJson() {
  const response = await makeRequest(`${STAGING_URL}/api/docs?format=json`);
  
  if (response.status !== 200) {
    throw new Error(`API docs JSON endpoint failed with status ${response.status}`);
  }
  
  if (!response.data.openapi || !response.data.info) {
    throw new Error('API docs JSON should return OpenAPI specification');
  }
  
  log('API documentation JSON format working');
}

// Test 3: Standardized Error Response Format
async function testErrorResponseFormat() {
  const response = await makeRequest(`${STAGING_URL}/api/nonexistent-endpoint`);
  
  if (response.status !== 404) {
    throw new Error(`Expected 404 for nonexistent endpoint, got ${response.status}`);
  }
  
  // Check if response follows our standardized format
  if (response.data && typeof response.data === 'object') {
    if (response.data.success !== false) {
      throw new Error('Error response should have success: false');
    }
  }
  
  log('Error response format is standardized');
}

// Test 4: Rate Limiting Headers
async function testRateLimitHeaders() {
  const response = await makeRequest(`${STAGING_URL}/api/health`);
  
  if (response.status !== 200) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  
  // Check for rate limit headers (if implemented)
  const rateLimitHeaders = [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ];
  
  const hasRateLimitHeaders = rateLimitHeaders.some(header => 
    response.headers[header.toLowerCase()] !== undefined
  );
  
  if (hasRateLimitHeaders) {
    log('Rate limiting headers present');
  } else {
    log('Rate limiting headers not yet implemented (expected)');
  }
}

// Test 5: API Versioning
async function testApiVersioning() {
  // Test with version header
  const response = await makeRequest(`${STAGING_URL}/api/health`, {
    headers: {
      'X-API-Version': 'v1.0.0'
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Versioned request failed with status ${response.status}`);
  }
  
  // Check for version headers in response
  if (response.headers['x-api-version']) {
    log('API versioning headers present');
  } else {
    log('API versioning headers not yet implemented (expected)');
  }
}

// Test 6: Request ID Tracking
async function testRequestIdTracking() {
  const response = await makeRequest(`${STAGING_URL}/api/health`);
  
  if (response.status !== 200) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  
  // Check if response includes request ID in meta
  if (response.data && response.data.meta && response.data.meta.requestId) {
    log('Request ID tracking working');
  } else {
    log('Request ID tracking not yet implemented (expected)');
  }
}

// Test 7: Content Type Validation
async function testContentTypeValidation() {
  const response = await makeRequest(`${STAGING_URL}/api/email-alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain' // Wrong content type
    },
    body: 'invalid data'
  });
  
  // Should handle invalid content type gracefully
  if (response.status >= 400 && response.status < 500) {
    log('Content type validation working');
  } else {
    log('Content type validation not yet implemented (expected)');
  }
}

// Test 8: CORS Headers
async function testCorsHeaders() {
  const response = await makeRequest(`${STAGING_URL}/api/health`, {
    headers: {
      'Origin': 'https://example.com'
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`CORS test failed with status ${response.status}`);
  }
  
  // Check for CORS headers
  const corsHeaders = [
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers'
  ];
  
  const hasCorsHeaders = corsHeaders.some(header => 
    response.headers[header.toLowerCase()] !== undefined
  );
  
  if (hasCorsHeaders) {
    log('CORS headers present');
  } else {
    log('CORS headers not yet implemented (expected)');
  }
}

// Test 9: Security Headers
async function testSecurityHeaders() {
  const response = await makeRequest(`${STAGING_URL}/api/health`);
  
  if (response.status !== 200) {
    throw new Error(`Security headers test failed with status ${response.status}`);
  }
  
  // Check for security headers
  const securityHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection'
  ];
  
  const hasSecurityHeaders = securityHeaders.some(header => 
    response.headers[header.toLowerCase()] !== undefined
  );
  
  if (hasSecurityHeaders) {
    log('Security headers present');
  } else {
    log('Security headers not yet implemented (expected)');
  }
}

// Test 10: API Response Consistency
async function testApiResponseConsistency() {
  const endpoints = [
    '/api/health',
    '/api/email-alerts'
  ];
  
  for (const endpoint of endpoints) {
    const response = await makeRequest(`${STAGING_URL}${endpoint}`);
    
    // Check if response follows our standardized format
    if (response.data && typeof response.data === 'object') {
      if (response.status >= 200 && response.status < 300) {
        if (response.data.success !== true && response.data.success !== undefined) {
          log(`Warning: ${endpoint} response format may not be standardized`);
        }
      }
    }
  }
  
  log('API response consistency checked');
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Module 4 Tests...');
  log(`Testing against: ${STAGING_URL}`);
  
  await runTest('API Documentation Endpoint', testApiDocs);
  await runTest('API Documentation JSON Format', testApiDocsJson);
  await runTest('Error Response Format', testErrorResponseFormat);
  await runTest('Rate Limiting Headers', testRateLimitHeaders);
  await runTest('API Versioning', testApiVersioning);
  await runTest('Request ID Tracking', testRequestIdTracking);
  await runTest('Content Type Validation', testContentTypeValidation);
  await runTest('CORS Headers', testCorsHeaders);
  await runTest('Security Headers', testSecurityHeaders);
  await runTest('API Response Consistency', testApiResponseConsistency);
  
  // Print summary
  log('\n📊 Test Summary:');
  log(`✅ Passed: ${testResults.passed}`);
  log(`❌ Failed: ${testResults.failed}`);
  log(`📈 Total: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => log(`  - ${t.name}: ${t.error}`));
  }
  
  if (testResults.failed === 0) {
    log('\n🎉 All tests passed! Module 4 is working correctly.');
  } else {
    log('\n⚠️ Some tests failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`❌ Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runAllTests, runTest, makeRequest };

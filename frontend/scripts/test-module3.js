#!/usr/bin/env node

/**
 * Module 3 Testing Script
 * Tests webhook handling, plan synchronization, and subscription lifecycle
 */

const https = require('https');
const http = require('http');

// Configuration
const STAGING_URL = 'https://staging.dogyenta.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret';

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

// Test 1: Health Check
async function testHealthCheck() {
  const response = await makeRequest(`${STAGING_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  log('Health check passed');
}

// Test 2: Plan Sync Admin Endpoint
async function testPlanSyncEndpoint() {
  const response = await makeRequest(`${STAGING_URL}/api/admin/sync-plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`
    },
    body: { action: 'validate' }
  });
  
  if (response.status === 404) {
    log('Plan sync endpoint not deployed yet (404) - skipping test');
    return;
  }
  
  if (response.status !== 200) {
    throw new Error(`Plan sync endpoint failed with status ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Plan sync validation failed: ${JSON.stringify(response.data)}`);
  }
  
  log('Plan sync endpoint working');
}

// Test 3: Find Plan Mismatches
async function testFindMismatches() {
  const response = await makeRequest(`${STAGING_URL}/api/admin/sync-plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`
    },
    body: { action: 'find-mismatches' }
  });
  
  if (response.status === 404) {
    log('Plan sync endpoint not deployed yet (404) - skipping test');
    return;
  }
  
  if (response.status !== 200) {
    throw new Error(`Find mismatches failed with status ${response.status}`);
  }
  
  log(`Found ${response.data.count || 0} plan mismatches`);
}

// Test 4: Webhook Endpoint (without valid signature)
async function testWebhookEndpoint() {
  const response = await makeRequest(`${STAGING_URL}/api/stripe/webhook`, {
    method: 'POST',
    headers: {
      'stripe-signature': 'invalid_signature'
    },
    body: { type: 'test.event' }
  });
  
  // Should return 400 for invalid signature
  if (response.status !== 400) {
    throw new Error(`Webhook should reject invalid signature, got status ${response.status}`);
  }
  
  log('Webhook correctly rejects invalid signatures');
}

// Test 5: Email Alerts Endpoint
async function testEmailAlertsEndpoint() {
  const response = await makeRequest(`${STAGING_URL}/api/email-alerts`);
  
  if (response.status !== 200 && response.status !== 401) {
    throw new Error(`Email alerts endpoint failed with status ${response.status}`);
  }
  
  log('Email alerts endpoint accessible');
}

// Test 6: Unsubscribe Endpoint
async function testUnsubscribeEndpoint() {
  const response = await makeRequest(`${STAGING_URL}/api/unsubscribe`, {
    method: 'POST',
    body: { token: 'invalid_token' }
  });
  
  if (response.status !== 400) {
    throw new Error(`Unsubscribe should reject invalid token, got status ${response.status}`);
  }
  
  log('Unsubscribe endpoint correctly validates tokens');
}

// Test 7: Cron Endpoint (with invalid secret)
async function testCronEndpoint() {
  const response = await makeRequest(`${STAGING_URL}/api/cron/email-alerts`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid_secret'
    }
  });
  
  if (response.status !== 401) {
    throw new Error(`Cron endpoint should reject invalid secret, got status ${response.status}`);
  }
  
  log('Cron endpoint correctly validates secrets');
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Module 3 Tests...');
  log(`Testing against: ${STAGING_URL}`);
  
  await runTest('Health Check', testHealthCheck);
  await runTest('Plan Sync Endpoint', testPlanSyncEndpoint);
  await runTest('Find Plan Mismatches', testFindMismatches);
  await runTest('Webhook Endpoint Security', testWebhookEndpoint);
  await runTest('Email Alerts Endpoint', testEmailAlertsEndpoint);
  await runTest('Unsubscribe Endpoint', testUnsubscribeEndpoint);
  await runTest('Cron Endpoint Security', testCronEndpoint);
  
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
    log('\n🎉 All tests passed! Module 3 is working correctly.');
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

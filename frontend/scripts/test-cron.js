#!/usr/bin/env node
/**
 * Test script for the email alerts cron job
 * 
 * NOTE: This script tests LOCAL/STAGING by default (http://localhost:3000)
 * For production testing, use: scripts/test-cron-production.js
 * 
 * Usage:
 *   node scripts/test-cron.js [--method trigger|direct] [--url <base-url>]
 * 
 * Examples:
 *   # Test locally using the trigger endpoint (recommended)
 *   node scripts/test-cron.js --method trigger
 * 
 *   # Test locally directly calling the cron endpoint
 *   node scripts/test-cron.js --method direct
 * 
 *   # Test on staging
 *   node scripts/test-cron.js --url https://staging.dogyenta.com --method trigger
 * 
 *   # For production testing, use:
 *   node scripts/test-cron-production.js
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const https = require('https');
const http = require('http');

const BASE_URL = process.argv.includes('--url') 
  ? process.argv[process.argv.indexOf('--url') + 1]
  : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const METHOD = process.argv.includes('--method')
  ? process.argv[process.argv.indexOf('--method') + 1]
  : 'trigger';

// Determine which secret to use based on environment
const isProduction = process.env.VERCEL_ENV === 'production';
const CRON_SECRET = isProduction 
  ? process.env.CRON_SECRET_PROD 
  : process.env.CRON_SECRET_STAGING;

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 60000 // 60 second timeout for cron jobs
    };

    const req = client.request(requestOptions, (res) => {
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testCronDirect() {
  logSection('Testing Cron Job (Direct Method)');
  
  if (!CRON_SECRET) {
    logError('CRON_SECRET_STAGING or CRON_SECRET_PROD is not set in environment variables');
    logInfo('Please set CRON_SECRET_STAGING for staging/preview environments');
    logInfo('Or set CRON_SECRET_PROD for production environments');
    process.exit(1);
  }

  const url = `${BASE_URL}/api/cron/email-alerts`;
  logInfo(`URL: ${url}`);
  logInfo(`Environment: ${isProduction ? 'production' : 'staging/development'}`);
  logInfo(`Using secret: ${CRON_SECRET.substring(0, 8)}...`);

  try {
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    const data = response.data;

    if (response.status !== 200) {
      logError(`Cron job failed with status ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    logSuccess('Cron job executed successfully!');
    console.log('\nResults:');
    console.log(JSON.stringify(data, null, 2));

    // Print summary
    if (data.processed !== undefined) {
      logSection('Summary');
      logInfo(`Processed: ${data.processed} users`);
      logInfo(`Sent: ${data.sent} emails`);
      logInfo(`Errors: ${data.errors}`);
      
      if (data.results && Array.isArray(data.results)) {
        const statusCounts = {};
        data.results.forEach(result => {
          statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
        });
        
        console.log('\nStatus Breakdown:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          logInfo(`${status}: ${count}`);
        });
      }
    }

    return data;
  } catch (error) {
    logError(`Failed to call cron endpoint: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

async function testCronTrigger() {
  logSection('Testing Cron Job (Trigger Method)');
  
  const url = `${BASE_URL}/api/trigger-cron`;
  logInfo(`URL: ${url}`);
  logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // In development, no auth is required
  const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
  const authHeader = ADMIN_SECRET || CRON_SECRET;

  if (!isDev && !authHeader) {
    logWarning('No ADMIN_SECRET or CRON_SECRET found. Auth may fail in non-dev environments.');
  } else if (authHeader) {
    logInfo(`Using auth: ${authHeader.substring(0, 8)}...`);
  } else {
    logInfo('No auth required (development mode)');
  }

  try {
    const headers = {};

    if (authHeader) {
      headers['Authorization'] = `Bearer ${authHeader}`;
    }

    const response = await makeRequest(url, {
      method: 'POST',
      headers,
    });

    const data = response.data;

    if (response.status !== 200) {
      logError(`Trigger endpoint failed with status ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    logSuccess('Cron job triggered successfully!');
    console.log('\nResults:');
    console.log(JSON.stringify(data, null, 2));

    // Print formatted summary
    if (data.summary) {
      logSection('Summary');
      logInfo(`Processed: ${data.summary.processed || 0} users`);
      logInfo(`Sent: ${data.summary.sent || 0} emails`);
      logInfo(`Errors: ${data.summary.errors || 0}`);
      logInfo(`Total Users: ${data.summary.totalUsers || 0}`);

      if (data.statusBreakdown) {
        console.log('\nStatus Breakdown:');
        Object.entries(data.statusBreakdown).forEach(([status, count]) => {
          if (count > 0) {
            logInfo(`${status}: ${count}`);
          }
        });
      }
    }

    return data;
  } catch (error) {
    logError(`Failed to call trigger endpoint: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

async function checkEnvironment() {
  logSection('Environment Check');

  const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
  
  // For trigger method in dev, CRON_SECRET is optional (auth not required)
  // For direct method, CRON_SECRET is always required
  const requireCronSecret = METHOD === 'direct';

  const checks = [
    {
      name: 'BASE_URL',
      value: BASE_URL,
      required: true,
    },
    {
      name: 'CRON_SECRET_STAGING',
      value: process.env.CRON_SECRET_STAGING ? '***set***' : undefined,
      required: requireCronSecret && !isProduction,
    },
    {
      name: 'CRON_SECRET_PROD',
      value: process.env.CRON_SECRET_PROD ? '***set***' : undefined,
      required: requireCronSecret && isProduction,
    },
    {
      name: 'RESEND_API_KEY',
      value: process.env.RESEND_API_KEY ? '***set***' : undefined,
      required: false,
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? '***set***' : undefined,
      required: false,
    },
  ];

  let allGood = true;
  checks.forEach(check => {
    if (check.required && !check.value) {
      logError(`${check.name} is not set (required for ${METHOD} method)`);
      allGood = false;
    } else if (check.value) {
      logSuccess(`${check.name} is set`);
    } else if (check.required === false) {
      logWarning(`${check.name} is not set (optional)`);
    } else {
      logInfo(`${check.name} is not set (optional in ${isDev ? 'development' : 'production'} mode for ${METHOD} method)`);
    }
  });

  if (!allGood) {
    logError('Some required environment variables are missing');
    logInfo('Please check your .env.local file');
    if (METHOD === 'direct') {
      return false;
    } else {
      logWarning('Continuing anyway (auth optional in dev mode for trigger method)');
    }
  }

  return true;
}

async function main() {
  console.log('\n');
  log('🧪 Cron Job Test Script (Local/Staging)', 'bright');
  log(`Method: ${METHOD}`, 'cyan');
  log(`Base URL: ${BASE_URL}`, 'cyan');
  
  // Warn if using production URL
  if (BASE_URL.includes('dogyenta.com') && !BASE_URL.includes('staging')) {
    logWarning('⚠️  WARNING: You are testing against production!');
    logWarning('⚠️  For production testing, use: scripts/test-cron-production.js');
    logWarning('⚠️  Continuing with production URL...');
  }

  // Check environment (non-blocking for trigger method in dev)
  const envOk = await checkEnvironment();
  if (!envOk && METHOD === 'direct') {
    logError('Cannot proceed with direct method - required environment variables missing');
    process.exit(1);
  }

  // Run the test
  try {
    if (METHOD === 'direct') {
      await testCronDirect();
    } else if (METHOD === 'trigger') {
      await testCronTrigger();
    } else {
      logError(`Invalid method: ${METHOD}. Use 'trigger' or 'direct'`);
      process.exit(1);
    }

    logSection('Test Complete');
    logSuccess('All tests passed!');
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});


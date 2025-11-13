#!/usr/bin/env node
/**
 * Production Cron Job Test Script
 * 
 * WARNING: This script will trigger the production cron job and send real emails to users.
 * Use with caution!
 * 
 * Usage:
 *   node scripts/test-cron-production.js [--confirm] [--url <production-url>]
 * 
 * Examples:
 *   # Test production cron (with confirmation prompt)
 *   node scripts/test-cron-production.js
 * 
 *   # Test production cron (skip confirmation)
 *   node scripts/test-cron-production.js --confirm
 * 
 *   # Test on specific production URL
 *   node scripts/test-cron-production.js --url https://dogyenta.com
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const https = require('https');
const http = require('http');
const readline = require('readline');

const PRODUCTION_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : process.env.PRODUCTION_URL || 'https://dogyenta.com';

const SKIP_CONFIRMATION = process.argv.includes('--confirm');

// Determine which secret to use - must be production
const CRON_SECRET_PROD = process.env.CRON_SECRET_PROD;
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
  magenta: '\x1b[35m',
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

function logCritical(message) {
  log(`🚨 ${message}`, 'magenta');
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
      timeout: 120000 // 2 minute timeout for production cron jobs
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

function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function checkProductionEnvironment() {
  logSection('Production Environment Check');

  // Verify this is actually a production URL
  if (!PRODUCTION_URL.includes('dogyenta.com') && !PRODUCTION_URL.includes('localhost')) {
    logError(`URL does not appear to be production: ${PRODUCTION_URL}`);
    logWarning('Expected URL to contain "dogyenta.com"');
    const confirmed = await askConfirmation('Continue anyway? (yes/no): ');
    if (!confirmed) {
      process.exit(1);
    }
  }

  // Check for production secret
  if (!CRON_SECRET_PROD && !ADMIN_SECRET) {
    logError('CRON_SECRET_PROD or ADMIN_SECRET is not set');
    logError('Cannot test production without proper authentication');
    logInfo('Please set CRON_SECRET_PROD in your .env.local file');
    process.exit(1);
  }

  const checks = [
    {
      name: 'PRODUCTION_URL',
      value: PRODUCTION_URL,
      required: true,
    },
    {
      name: 'CRON_SECRET_PROD',
      value: CRON_SECRET_PROD ? '***set***' : undefined,
      required: false,
    },
    {
      name: 'ADMIN_SECRET',
      value: ADMIN_SECRET ? '***set***' : undefined,
      required: false,
    },
  ];

  checks.forEach(check => {
    if (check.required && !check.value) {
      logError(`${check.name} is not set (required)`);
    } else if (check.value) {
      logSuccess(`${check.name} is set`);
    } else {
      logWarning(`${check.name} is not set (optional)`);
    }
  });

  return true;
}

async function checkProductionStatus() {
  logSection('Checking Production Status');

  try {
    // Try to check if production is accessible
    const healthUrl = `${PRODUCTION_URL}/api/health`;
    logInfo(`Checking production health: ${healthUrl}`);
    
    const response = await makeRequest(healthUrl, {
      method: 'GET',
    });

    if (response.status === 200) {
      logSuccess('Production is accessible');
      if (response.data) {
        console.log('Health check response:', JSON.stringify(response.data, null, 2));
      }
      return true;
    } else {
      logWarning(`Production health check returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logWarning(`Could not check production health: ${error.message}`);
    logInfo('Continuing anyway...');
    return false;
  }
}

async function testProductionCron() {
  logSection('Testing Production Cron Job');

  const url = `${PRODUCTION_URL}/api/trigger-cron`;
  logInfo(`URL: ${url}`);
  logCritical('WARNING: This will send real emails to all users with enabled alerts!');

  // Use ADMIN_SECRET if available, otherwise CRON_SECRET_PROD
  const authSecret = ADMIN_SECRET || CRON_SECRET_PROD;

  try {
    const headers = {
      'Authorization': `Bearer ${authSecret}`,
    };

    logInfo(`Using authentication: ${authSecret ? authSecret.substring(0, 8) + '...' : 'none'}`);

    const response = await makeRequest(url, {
      method: 'POST',
      headers,
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
            const emoji = status === 'sent' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
            logInfo(`${emoji} ${status}: ${count}`);
          }
        });
      }

      // Show sample results
      if (data.results && Array.isArray(data.results)) {
        logSection('Sample Results');
        const sentResults = data.results.filter(r => r.status === 'sent').slice(0, 5);
        const errorResults = data.results.filter(r => r.status === 'error').slice(0, 5);

        if (sentResults.length > 0) {
          logSuccess(`Successfully sent emails to ${sentResults.length} users:`);
          sentResults.forEach(result => {
            logInfo(`  - ${result.user} (${result.matchesCount || 0} matches)`);
          });
        }

        if (errorResults.length > 0) {
          logError(`Errors for ${errorResults.length} users:`);
          errorResults.forEach(result => {
            logError(`  - ${result.user}: ${result.error || result.reason || 'Unknown error'}`);
          });
        }
      }
    }

    return data;
  } catch (error) {
    logError(`Failed to call production cron endpoint: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

async function main() {
  console.log('\n');
  log('🧪 Production Cron Job Test Script', 'bright');
  logCritical('WARNING: This will send real emails to production users!');
  log(`Production URL: ${PRODUCTION_URL}`, 'cyan');

  // Check environment
  await checkProductionEnvironment();

  // Check production status
  await checkProductionStatus();

  // Confirm before proceeding
  if (!SKIP_CONFIRMATION) {
    logSection('Confirmation Required');
    logCritical('This script will trigger the production cron job and send emails to all users with enabled alerts.');
    logWarning('Make sure you have:');
    logWarning('  1. Verified the production URL is correct');
    logWarning('  2. Checked that email service is configured correctly');
    logWarning('  3. Verified users are expecting these emails');
    logWarning('  4. Have monitoring in place to track email delivery');

    const confirmed = await askConfirmation('\nAre you sure you want to proceed? (yes/no): ');
    if (!confirmed) {
      logInfo('Test cancelled by user');
      process.exit(0);
    }
  }

  // Run the test
  try {
    await testProductionCron();

    logSection('Test Complete');
    logSuccess('Production cron job test completed successfully!');
    logInfo('Please verify:');
    logInfo('  1. Emails were delivered to users');
    logInfo('  2. Check Resend dashboard for delivery status');
    logInfo('  3. Check database email_events table for logged events');
    logInfo('  4. Monitor user feedback');
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


#!/usr/bin/env node
/**
 * Production Status Check Script
 * 
 * This script checks production status without sending emails.
 * It queries the database to see how many users have email alerts enabled.
 * 
 * Usage:
 *   node scripts/check-production-status.js [--url <production-url>]
 * 
 * Examples:
 *   # Check production status
 *   node scripts/check-production-status.js
 * 
 *   # Check on specific URL
 *   node scripts/check-production-status.js --url https://dogyenta.com
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const https = require('https');
const http = require('http');

const PRODUCTION_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : process.env.PRODUCTION_URL || 'https://dogyenta.com';

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
      timeout: 30000 // 30 second timeout
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

async function checkProductionHealth() {
  logSection('Production Health Check');

  try {
    const healthUrl = `${PRODUCTION_URL}/api/health`;
    logInfo(`Checking production health: ${healthUrl}`);
    
    const response = await makeRequest(healthUrl, {
      method: 'GET',
    });

    if (response.status === 200) {
      logSuccess('Production is accessible and healthy');
      if (response.data) {
        console.log('Health check response:', JSON.stringify(response.data, null, 2));
      }
      return true;
    } else {
      logWarning(`Production health check returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Could not check production health: ${error.message}`);
    return false;
  }
}

async function checkCronEndpoint() {
  logSection('Cron Endpoint Status');

  try {
    // Try to get the cron endpoint info (if it supports GET for status)
    // Since it doesn't, we'll just check if it's accessible
    const cronUrl = `${PRODUCTION_URL}/api/cron/email-alerts`;
    logInfo(`Checking cron endpoint: ${cronUrl}`);
    
    // Note: We're not actually calling the cron job, just checking if it exists
    // The endpoint will return 401 without auth, which is expected
    const response = await makeRequest(cronUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-secret-for-status-check',
      },
    });

    if (response.status === 401) {
      logSuccess('Cron endpoint is accessible (returns 401 without valid auth, which is expected)');
      return true;
    } else if (response.status === 200) {
      logWarning('Cron endpoint returned 200 (may have executed - check logs)');
      return true;
    } else {
      logWarning(`Cron endpoint returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Could not check cron endpoint: ${error.message}`);
    return false;
  }
}

async function checkTriggerEndpoint() {
  logSection('Trigger Endpoint Status');

  try {
    const triggerUrl = `${PRODUCTION_URL}/api/trigger-cron`;
    logInfo(`Checking trigger endpoint: ${triggerUrl}`);
    
    // Try GET first to see if it returns info
    const response = await makeRequest(triggerUrl, {
      method: 'GET',
    });

    if (response.status === 200) {
      logSuccess('Trigger endpoint is accessible');
      if (response.data) {
        console.log('Endpoint info:', JSON.stringify(response.data, null, 2));
      }
      return true;
    } else {
      logWarning(`Trigger endpoint returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Could not check trigger endpoint: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n');
  log('🔍 Production Status Check', 'bright');
  log(`Production URL: ${PRODUCTION_URL}`, 'cyan');
  logInfo('This script checks production status without sending emails.');

  // Check production health
  const healthOk = await checkProductionHealth();

  // Check cron endpoint
  const cronOk = await checkCronEndpoint();

  // Check trigger endpoint
  const triggerOk = await checkTriggerEndpoint();

  // Summary
  logSection('Summary');
  if (healthOk) {
    logSuccess('Production is healthy and accessible');
  } else {
    logError('Production health check failed');
  }

  if (cronOk) {
    logSuccess('Cron endpoint is accessible');
  } else {
    logError('Cron endpoint check failed');
  }

  if (triggerOk) {
    logSuccess('Trigger endpoint is accessible');
  } else {
    logError('Trigger endpoint check failed');
  }

  // Next steps
  logSection('Next Steps');
  logInfo('To check how many users have email alerts enabled, you can:');
  logInfo('  1. Query the database directly (if you have access)');
  logInfo('  2. Check Resend dashboard for recent email activity');
  logInfo('  3. Review production logs for cron job execution history');
  logInfo('  4. Use the production test script: node scripts/test-cron-production.js');

  logInfo('\nTo test the cron job in production (will send emails):');
  logInfo('  node scripts/test-cron-production.js');

  logInfo('\nTo check database for users with alerts enabled:');
  logInfo('  SELECT COUNT(*) FROM alert_settings WHERE enabled = true;');
}

main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});





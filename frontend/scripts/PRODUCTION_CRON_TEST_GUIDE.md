# Production Cron Job Testing Guide

This guide will help you safely test the email alerts cron job in production to verify that users with email alerts set up receive them successfully.

## ⚠️ Important Warnings

1. **Real Emails**: Testing in production will send real emails to real users
2. **All Users**: The cron job will process all users with enabled email alerts
3. **Rate Limiting**: Users who received an email today will be skipped (rate limiting)
4. **No Dry-Run**: Currently, there is no dry-run mode - emails will be sent

## Prerequisites

1. **Production Secrets**: You must have `CRON_SECRET_PROD` or `ADMIN_SECRET` set in your environment
2. **Production URL**: Know your production URL (default: `https://dogyenta.com`)
3. **Access**: Have access to production logs and monitoring
4. **Verification**: Have a way to verify emails were sent (Resend dashboard, database, user feedback)

## Testing Methods

### Method 1: Using the Production Test Script (Recommended)

The production test script provides safety checks and confirmation prompts.

```bash
cd frontend

# Test production cron (with confirmation prompt)
node scripts/test-cron-production.js

# Test production cron (skip confirmation - use with caution)
node scripts/test-cron-production.js --confirm

# Test on specific production URL
node scripts/test-cron-production.js --url https://dogyenta.com
```

### Method 2: Using curl

```bash
# Test production cron using trigger endpoint
curl -X POST "https://dogyenta.com/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json"

# Test production cron directly
curl -X POST "https://dogyenta.com/api/cron/email-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET_PROD" \
  -H "Content-Type: application/json"
```

### Method 3: Using Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to the "Cron Jobs" section
3. Find the email alerts cron job
4. Click "Trigger" to manually trigger the job
5. Monitor the logs for execution results

## Pre-Testing Checklist

Before testing in production, verify:

- [ ] **Production URL is correct**: Verify you're testing against the correct production URL
- [ ] **Secrets are set**: `CRON_SECRET_PROD` or `ADMIN_SECRET` is configured
- [ ] **Email service is configured**: Resend API key is set and domain is verified
- [ ] **Database is accessible**: Production database is accessible and up-to-date
- [ ] **Users have alerts enabled**: Verify at least some users have email alerts enabled
- [ ] **Monitoring is in place**: You can monitor email delivery and errors
- [ ] **Time is appropriate**: Consider the time of day - users may receive emails immediately

## Testing Steps

### Step 1: Check Production Status

First, verify that production is accessible and healthy:

```bash
curl https://dogyenta.com/api/health
```

Expected response: `200 OK` with health status

### Step 2: Check Users with Alerts Enabled

Before triggering the cron job, you may want to check how many users have alerts enabled. You can do this by:

1. **Database Query** (if you have access):
   ```sql
   SELECT COUNT(*) FROM alert_settings WHERE enabled = true;
   ```

2. **API Response**: The cron job response will show the number of users processed

### Step 3: Trigger the Cron Job

Use the production test script:

```bash
node scripts/test-cron-production.js
```

Or use curl:

```bash
curl -X POST "https://dogyenta.com/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" | jq
```

### Step 4: Monitor Execution

Watch for:
- **Response status**: Should be `200 OK`
- **Users processed**: Number of users with enabled alerts
- **Emails sent**: Number of emails successfully sent
- **Errors**: Any errors during execution

### Step 5: Verify Email Delivery

Check multiple sources:

1. **Resend Dashboard**:
   - Go to Resend dashboard
   - Check "Emails" section
   - Verify emails were sent and delivered
   - Check for any bounces or failures

2. **Database**:
   ```sql
   SELECT * FROM email_events 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

3. **User Feedback**:
   - Check if users received emails
   - Monitor support channels for issues
   - Check user engagement metrics

## Expected Results

### Successful Execution

```json
{
  "success": true,
  "message": "Cron job triggered successfully",
  "summary": {
    "processed": 10,
    "sent": 8,
    "errors": 0,
    "totalUsers": 10
  },
  "statusBreakdown": {
    "sent": 8,
    "already_sent_today": 1,
    "no_new_matches": 1,
    "error": 0
  }
}
```

### Common Statuses

- **`sent`**: Email was successfully sent
- **`already_sent_today`**: Email was already sent today (rate limiting working)
- **`no_prefs`**: User has no preferences configured
- **`no_matches`**: No dogs found matching preferences
- **`no_new_matches`**: No new or updated dogs since last alert
- **`paused`**: User has paused alerts
- **`error`**: An error occurred while processing

## Troubleshooting

### Issue: "Unauthorized" Error

**Solution**: Make sure you have the correct `CRON_SECRET_PROD` or `ADMIN_SECRET` set in your environment.

```bash
# Check if secret is set
echo $CRON_SECRET_PROD

# Or check .env.local file
cat .env.local | grep CRON_SECRET_PROD
```

### Issue: "No users with enabled email alerts"

**Solution**: 
1. Verify users have email alerts enabled in the database
2. Check that `alert_settings.enabled = true` for some users
3. Verify users have preferences configured

### Issue: "Email sending failed"

**Solution**:
1. Check Resend API key is correct and active
2. Verify domain is verified in Resend
3. Check Resend dashboard for API errors
4. Verify email service limits haven't been exceeded

### Issue: "Production not accessible"

**Solution**:
1. Check production URL is correct
2. Verify production is running and healthy
3. Check network connectivity
4. Verify DNS is resolving correctly

## Post-Testing Verification

After testing, verify:

- [ ] **Emails were delivered**: Check Resend dashboard
- [ ] **Events were logged**: Check `email_events` table in database
- [ ] **Users received emails**: Verify with test users
- [ ] **No errors occurred**: Check logs for any errors
- [ ] **Rate limiting worked**: Verify users who already received emails today were skipped
- [ ] **Database was updated**: Check `alert_settings.last_sent_at_utc` was updated

## Monitoring Production Cron Jobs

### Vercel Cron Jobs

1. Go to Vercel project dashboard
2. Navigate to "Cron Jobs" section
3. View cron job execution history
4. Check logs for each execution
5. Monitor success/failure rates

### Database Monitoring

Query the database to monitor cron job execution:

```sql
-- Check recent email events
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(created_at) as last_event
FROM email_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY last_event DESC;

-- Check users who received emails today
SELECT 
  user_id,
  MAX(created_at) as last_sent
FROM email_events
WHERE event_type = 'sent'
  AND created_at > CURRENT_DATE
GROUP BY user_id
ORDER BY last_sent DESC;
```

### Resend Dashboard

1. Go to Resend dashboard
2. Check "Emails" section for delivery status
3. Monitor bounce rates and failures
4. Check API usage and limits

## Best Practices

1. **Test During Low Traffic**: Test during off-peak hours to minimize impact
2. **Monitor Closely**: Watch logs and metrics during and after testing
3. **Verify Results**: Always verify emails were actually delivered
4. **Check User Feedback**: Monitor support channels for user issues
5. **Document Results**: Keep records of test results for future reference
6. **Gradual Rollout**: Consider testing with a small subset of users first

## Safety Measures

1. **Confirmation Prompts**: The test script requires confirmation before running
2. **Rate Limiting**: Users who received emails today are automatically skipped
3. **Error Handling**: Errors are logged and don't stop the entire process
4. **Monitoring**: Production monitoring should alert on failures
5. **Rollback Plan**: Have a plan to disable email alerts if needed

## Additional Resources

- [Email Alerts Setup Guide](./CRON_TEST_GUIDE.md)
- [Module 6 Test Plan](../docs/MODULE_6_TEST_PLAN.md)
- [Email Compliance Checklist](../docs/EMAIL_COMPLIANCE_CHECKLIST.md)
- [Observability Runbook](../docs/OBSERVABILITY_RUNBOOK.md)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review production logs
3. Check Resend dashboard for email delivery status
4. Verify database state
5. Contact support if needed


# Cron Job Testing Guide

This guide will help you test the email alerts cron job.

## Prerequisites

1. **Environment Variables**: Make sure you have the following set in your `.env.local`:
   - `CRON_SECRET_STAGING` or `CRON_SECRET_PROD` (depending on environment)
   - `RESEND_API_KEY` (for sending emails)
   - `NEXT_PUBLIC_BASE_URL` (defaults to `http://localhost:3000`)

2. **Database Setup**: Ensure you have:
   - Users with email alerts enabled
   - Alert settings configured
   - User preferences set

3. **Running Server**: The Next.js server should be running:
   ```bash
   npm run dev
   ```

## Testing Methods

### Method 1: Using the Test Script (Recommended)

The test script provides a convenient way to test the cron job with detailed output.

#### Test using the trigger endpoint (recommended):
```bash
cd frontend
node scripts/test-cron.js --method trigger
```

#### Test directly calling the cron endpoint:
```bash
node scripts/test-cron.js --method direct
```

#### Test on a specific URL:
```bash
node scripts/test-cron.js --url https://staging.dogyenta.com --method trigger
```

### Method 2: Using curl

#### Test the trigger endpoint:
```bash
curl -X POST "http://localhost:3000/api/trigger-cron" \
  -H "Content-Type: application/json"
```

Note: In development mode, authentication is optional. In production, you'll need:
```bash
curl -X POST "http://localhost:3000/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json"
```

#### Test the cron endpoint directly:
```bash
curl -X POST "http://localhost:3000/api/cron/email-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Method 3: Using the Browser

1. Open your browser and navigate to:
   ```
   http://localhost:3000/api/trigger-cron
   ```
   
   Note: This will show usage instructions. To actually trigger the cron job, use POST method (see curl examples above).

## Expected Results

### Successful Response

When the cron job runs successfully, you should see:

```json
{
  "message": "Email alerts cron job completed",
  "processed": 5,
  "sent": 3,
  "errors": 0,
  "results": [
    {
      "user": "user@example.com",
      "status": "sent",
      "matchesCount": 5,
      "messageId": "re_xxxxx"
    },
    {
      "user": "user2@example.com",
      "status": "no_new_matches",
      "reason": "No new or updated dogs since last alert"
    }
  ]
}
```

### Status Types

The cron job can return the following statuses for each user:

- **`sent`**: Email was successfully sent
- **`already_sent_today`**: Email was already sent today (rate limiting)
- **`no_prefs`**: User has no preferences configured
- **`no_matches`**: No dogs found matching preferences
- **`no_new_matches`**: No new or updated dogs since last alert
- **`paused`**: User has paused alerts
- **`error`**: An error occurred while processing

## Troubleshooting

### Issue: "Unauthorized" Error

**Solution**: Make sure you have the correct `CRON_SECRET_STAGING` or `CRON_SECRET_PROD` set in your `.env.local` file.

```bash
# Generate a new secret:
openssl rand -base64 32

# Add to .env.local:
CRON_SECRET_STAGING=your-generated-secret-here
```

### Issue: "No users with enabled email alerts"

**Solution**: 
1. Make sure you have users in your database
2. Enable email alerts for at least one user:
   - Go to `/profile`
   - Toggle "Email Notifications" ON
   - Configure preferences

### Issue: "No preferences found for user"

**Solution**: 
1. Make sure the user has preferences set in the database
2. Check that preferences are properly linked to the user

### Issue: "Dog search failed"

**Solution**:
1. Check that the `/api/dogs` endpoint is working
2. Verify Petfinder API credentials are set
3. Check network connectivity

### Issue: "Email sending failed"

**Solution**:
1. Verify `RESEND_API_KEY` is set correctly
2. Check Resend dashboard for API key status
3. Verify domain is verified in Resend (if using custom domain)
4. Check email service logs

## Testing Checklist

- [ ] Environment variables are set
- [ ] Server is running
- [ ] At least one user has email alerts enabled
- [ ] User has preferences configured
- [ ] Test script runs without errors
- [ ] Cron job returns success response
- [ ] Emails are received (check inbox)
- [ ] Email events are logged in database
- [ ] Alert settings are updated after sending

## Manual Testing Steps

1. **Enable Email Alerts**:
   - Sign in to your account
   - Go to `/profile`
   - Enable "Email Notifications"
   - Configure preferences (zip code, radius, etc.)

2. **Trigger Cron Job**:
   ```bash
   node scripts/test-cron.js --method trigger
   ```

3. **Check Results**:
   - Verify the response shows successful execution
   - Check your email inbox for the alert
   - Verify email events are logged in the database

4. **Verify Rate Limiting**:
   - Trigger the cron job again immediately
   - Should see `already_sent_today` status
   - Verify no duplicate emails are sent

## Production Testing

For production environments:

1. **Set Production Secrets**:
   ```bash
   CRON_SECRET_PROD=your-production-secret
   ```

2. **Test on Staging First**:
   ```bash
   node scripts/test-cron.js --url https://staging.dogyenta.com --method trigger
   ```

3. **Monitor Logs**:
   - Check Vercel logs for cron job execution
   - Verify email delivery in Resend dashboard
   - Monitor database for email events

## Vercel Cron Configuration

The cron job is configured in `vercel.json` to run daily at 12pm Eastern (5pm UTC):

```json
{
  "crons": [
    {
      "path": "/api/cron/email-alerts",
      "schedule": "0 17 * * *"
    }
  ]
}
```

Vercel will automatically call the endpoint with the proper authentication header. No manual setup required.

## Additional Resources

- [Email Alerts Setup Guide](../docs/EMAIL_ALERTS_SETUP_GUIDE.md)
- [Module 6 Test Plan](../docs/MODULE_6_TEST_PLAN.md)
- [Email Compliance Checklist](../docs/EMAIL_COMPLIANCE_CHECKLIST.md)





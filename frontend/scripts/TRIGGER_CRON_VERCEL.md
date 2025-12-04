# Easy Way to Trigger Cron Job in Production (Vercel)

The easiest way to trigger your cron job in production is directly from Vercel's dashboard! 🎉

## Method 1: Vercel Dashboard (Easiest) ⭐

### Step 1: Go to Vercel Dashboard
1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (dogfinder-app)
3. Navigate to the **Settings** tab
4. Click on **Cron Jobs** in the left sidebar

### Step 2: Find Your Cron Job
You should see your cron job listed:
- **Path**: `/api/cron/email-alerts`
- **Schedule**: `0 17 * * *` (Daily at 12pm Eastern / 5pm UTC)

### Step 3: Manually Trigger
1. Click on the cron job to view details
2. Look for a **"Trigger Now"** or **"Run Now"** button
3. Click it to manually trigger the cron job
4. View the execution logs to see results

### Step 4: Check Results
- View execution logs in Vercel dashboard
- Check function logs for detailed output
- Verify emails were sent in Resend dashboard

## Method 2: Vercel CLI (If Dashboard Doesn't Work)

If the dashboard doesn't have a "Trigger Now" button, you can use Vercel CLI:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Trigger the cron job manually
vercel cron trigger email-alerts --project dogfinder-app
```

## Method 3: Direct API Call (Alternative)

If you want to trigger it directly without Vercel dashboard:

### Option A: Use the Trigger Endpoint (Recommended)

The easiest way is to use your `/api/trigger-cron` endpoint from any HTTP client:

```bash
# Using curl
curl -X POST "https://dogyenta.com/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json"

# Or use a tool like Postman, Insomnia, or httpie
```

### Option B: Direct Cron Endpoint

```bash
# Using curl
curl -X POST "https://dogyenta.com/api/cron/email-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET_PROD" \
  -H "Content-Type: application/json"
```

## Method 4: Vercel Function Logs (Monitoring)

After triggering, check the logs:

1. Go to Vercel Dashboard
2. Select your project
3. Navigate to **Deployments**
4. Click on the latest deployment
5. Go to **Functions** tab
6. Click on `/api/cron/email-alerts`
7. View the **Logs** tab to see execution details

## Important Notes

### Authentication

The cron endpoint requires authentication:
- **Production**: Uses `CRON_SECRET_PROD` environment variable
- **Staging**: Uses `CRON_SECRET_STAGING` environment variable
- **Trigger Endpoint**: Uses `ADMIN_SECRET` or falls back to cron secret

### Vercel Automatic Triggers

When Vercel automatically triggers your cron job (scheduled runs), it sends a special header. Make sure your environment variables are set in Vercel:

1. Go to Vercel Dashboard
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Ensure these are set:
   - `CRON_SECRET_PROD` (for production)
   - `CRON_SECRET_STAGING` (for preview/staging)

### Checking Execution Results

After triggering, you can verify it worked by:

1. **Vercel Logs**: Check function execution logs
2. **Resend Dashboard**: Check email delivery status
3. **Database**: Query `email_events` table
4. **User Feedback**: Check if users received emails

## Quick Test Checklist

- [ ] Navigate to Vercel Dashboard
- [ ] Go to Cron Jobs section
- [ ] Find `/api/cron/email-alerts` cron job
- [ ] Click "Trigger Now" or use CLI
- [ ] Check execution logs
- [ ] Verify emails were sent
- [ ] Check Resend dashboard for delivery status

## Troubleshooting

### Issue: Can't find "Trigger Now" button
**Solution**: 
- Check if you're on the correct project
- Ensure the cron job is deployed
- Try using Vercel CLI instead

### Issue: Cron job returns 401 Unauthorized
**Solution**:
- Check that `CRON_SECRET_PROD` is set in Vercel environment variables
- Verify the secret matches what's expected
- Check Vercel logs for authentication details

### Issue: Cron job runs but no emails sent
**Solution**:
- Check Resend API key is set
- Verify email service is configured
- Check function logs for errors
- Verify users have alerts enabled

## Recommended Workflow

1. **Use Vercel Dashboard** (easiest)
   - Navigate to Cron Jobs
   - Click "Trigger Now"
   - View logs

2. **Check Results**
   - View Vercel function logs
   - Check Resend dashboard
   - Verify database updates

3. **Monitor**
   - Check execution time
   - Monitor error rates
   - Verify email delivery

## Next Steps

Once you've verified the cron job works:
1. Monitor scheduled runs (daily at 12pm Eastern)
2. Set up alerts for failures
3. Monitor email delivery rates
4. Check user engagement

---

**Note**: The easiest way is definitely using Vercel's dashboard if it has a "Trigger Now" button. If not, use the `/api/trigger-cron` endpoint or Vercel CLI.





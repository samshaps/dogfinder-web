# 🚀 Easy Way to Trigger Cron Job in Production (Vercel)

## ✅ Easiest Method: Use Your `/api/trigger-cron` Endpoint

You already have a trigger endpoint set up! Just call it from anywhere:

### Method 1: From Vercel Dashboard (No Code!)

1. **Go to Vercel Dashboard**
   - Open https://vercel.com/dashboard
   - Select your project
   - Go to **Deployments** → Latest deployment
   - Click **Functions** tab

2. **Find the Trigger Endpoint**
   - Look for `/api/trigger-cron`
   - You can view logs or test it directly

3. **Trigger It**
   - Use Vercel's built-in testing (if available)
   - OR use the curl command below

### Method 2: Use curl (Copy & Paste)

Just run this command (replace `YOUR_ADMIN_SECRET` with your actual secret):

```bash
curl -X POST "https://dogyenta.com/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json"
```

### Method 3: Use Browser Console

Open your browser console on your production site and run:

```javascript
fetch('https://dogyenta.com/api/trigger-cron', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_SECRET',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

### Method 4: Vercel Cron Jobs Dashboard

1. Go to **Settings** → **Cron Jobs** in Vercel Dashboard
2. Find your cron job: `/api/cron/email-alerts`
3. Look for **"Trigger Now"** button (if available on your plan)
4. Click it!

## 🔑 How to Get Your Admin Secret

1. **Go to Vercel Dashboard**
   - Select your project
   - Go to **Settings** → **Environment Variables**
   - Look for `ADMIN_SECRET` or `CRON_SECRET_PROD`
   - Copy the value

2. **If it doesn't exist**, you can:
   - Set it in Vercel Dashboard
   - Generate one: `openssl rand -base64 32`
   - Add it to Vercel environment variables

## 📊 Check Results

After triggering, you'll get a response like:

```json
{
  "success": true,
  "message": "Cron job triggered successfully",
  "summary": {
    "processed": 10,
    "sent": 8,
    "errors": 0
  },
  "statusBreakdown": {
    "sent": 8,
    "already_sent_today": 1,
    "no_new_matches": 1
  }
}
```

## 🎯 Recommended: Create a Simple Bookmark

Create a bookmark with this JavaScript:

```javascript
javascript:(function(){
  fetch('https://dogyenta.com/api/trigger-cron', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_ADMIN_SECRET',
      'Content-Type': 'application/json'
    }
  })
  .then(r => r.json())
  .then(data => alert('Success! Processed: ' + data.summary.processed + ', Sent: ' + data.summary.sent))
  .catch(err => alert('Error: ' + err.message));
})();
```

Then you can trigger it with one click!

## ⚡ Even Easier: Use Vercel's Cron Dashboard

If Vercel supports manual triggering (depends on your plan):

1. Go to **Settings** → **Cron Jobs**
2. Find `/api/cron/email-alerts`
3. Click **"Trigger Now"** or **"Run Now"**
4. View logs to see results

## 🔍 Verify It Works

After triggering:

1. **Check Response**: You'll see JSON with results
2. **Check Vercel Logs**: View function execution logs
3. **Check Resend Dashboard**: Verify emails were sent
4. **Check Database**: Query `email_events` table

## 🚨 Troubleshooting

### Issue: 401 Unauthorized
**Solution**: Make sure `ADMIN_SECRET` or `CRON_SECRET_PROD` is set in Vercel environment variables.

### Issue: Endpoint not found
**Solution**: Make sure your latest deployment includes the `/api/trigger-cron` endpoint.

### Issue: No emails sent
**Solution**: 
- Check that users have email alerts enabled
- Verify `RESEND_API_KEY` is set
- Check function logs for errors

## 🎉 Summary

**Easiest way**: Use curl to call `/api/trigger-cron`

```bash
curl -X POST "https://dogyenta.com/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

That's it! No local setup needed, just your `ADMIN_SECRET` from Vercel! 🚀





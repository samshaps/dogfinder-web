# Easy Way to Trigger Cron Job in Production 🚀

## 🎯 Easiest Method: Use Your Trigger Endpoint

The **simplest way** is to use your existing `/api/trigger-cron` endpoint. It handles everything for you!

### Option 1: Use Vercel Dashboard (No Code Needed!)

1. **Go to Vercel Dashboard**
   - Open https://vercel.com/dashboard
   - Select your project
   - Go to **Deployments** tab
   - Click on your latest production deployment

2. **Open Function Logs**
   - Click on **Functions** tab
   - Find `/api/trigger-cron`
   - Click on it to see details

3. **Trigger the Endpoint**
   - You can use Vercel's built-in testing, OR
   - Use any HTTP client to call: `https://dogyenta.com/api/trigger-cron`

### Option 2: Use Browser or HTTP Client (Super Easy!)

Just open this URL in your browser (if GET works) or use any HTTP client:

```bash
# Using curl (easiest)
curl -X POST "https://dogyenta.com/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"

# Or use Postman, Insomnia, or even your browser's console:
# fetch('https://dogyenta.com/api/trigger-cron', { method: 'POST', headers: { 'Authorization': 'Bearer YOUR_ADMIN_SECRET' } })
```

### Option 3: Vercel Cron Jobs Dashboard

1. Go to **Settings** → **Cron Jobs** in Vercel Dashboard
2. Find your cron job: `/api/cron/email-alerts`
3. Look for **"Trigger Now"** or **"Run Now"** button
4. Click it to manually trigger

### Option 4: Use Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# List cron jobs
vercel cron ls

# Trigger manually (if supported)
vercel cron trigger email-alerts
```

## ✅ Quick Test (Copy & Paste)

The **absolute easiest** way is to use curl with your trigger endpoint:

```bash
curl -X POST "https://dogyenta.com/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json"
```

Replace `YOUR_ADMIN_SECRET` with your actual `ADMIN_SECRET` from Vercel environment variables.

## 🔍 How to Get Your Admin Secret

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `ADMIN_SECRET` (or `CRON_SECRET_PROD`)
5. Copy the value
6. Use it in the curl command above

## 📊 Check Results

After triggering, check:

1. **Vercel Logs**: View function execution logs in Vercel Dashboard
2. **Response**: The endpoint returns a JSON response with results
3. **Resend Dashboard**: Check if emails were sent
4. **Database**: Query `email_events` table

## 🎉 Expected Response

You should see something like:

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
    "no_new_matches": 1
  }
}
```

## 🚨 Troubleshooting

### Issue: 401 Unauthorized
**Solution**: Make sure you have `ADMIN_SECRET` or `CRON_SECRET_PROD` set in Vercel environment variables.

### Issue: Endpoint not found
**Solution**: Make sure your latest deployment includes the `/api/trigger-cron` endpoint.

### Issue: No emails sent
**Solution**: 
- Check that users have email alerts enabled
- Verify `RESEND_API_KEY` is set in Vercel
- Check function logs for errors

## 💡 Pro Tip

**Create a bookmark** or **browser extension** that calls your trigger endpoint with the auth header. Then you can trigger it with one click!

Or create a simple HTML page:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Trigger Cron Job</title>
</head>
<body>
    <button onclick="triggerCron()">Trigger Cron Job</button>
    <pre id="result"></pre>
    
    <script>
        async function triggerCron() {
            const result = document.getElementById('result');
            result.textContent = 'Triggering...';
            
            try {
                const response = await fetch('https://dogyenta.com/api/trigger-cron', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer YOUR_ADMIN_SECRET',
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                result.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                result.textContent = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

Save this as `trigger-cron.html`, replace `YOUR_ADMIN_SECRET`, and open it in your browser!

---

## 🎯 Summary

**Easiest Method**: Use curl to call `/api/trigger-cron` endpoint
**No Setup Needed**: Just need your `ADMIN_SECRET` from Vercel
**Instant Results**: See results immediately in the response

```bash
curl -X POST "https://dogyenta.com/api/trigger-cron" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

That's it! 🎉





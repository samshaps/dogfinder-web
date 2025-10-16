# Email Alerts Setup Guide

## 🚀 Quick Start for Testing

### 1. Environment Setup

#### Required Environment Variables
Add these to your `.env.local` file:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM=theyenta@dogyenta.com
EMAIL_REPLY_TO=support@dogyenta.com
EMAIL_DOMAIN=dogyenta.com
EMAIL_UNSUBSCRIBE_URL=https://dogyenta.com/unsubscribe
DASHBOARD_URL=https://dogyenta.com/profile
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Cron Job Security
CRON_SECRET=your-secure-random-string-here
```

#### Resend Account Setup
1. **Sign up** at [resend.com](https://resend.com)
2. **Create API key** in your dashboard
3. **Add domain** (dogyenta.com) or use their test domain
4. **Verify domain** (if using your own domain)
5. **Add API key** to your environment variables

### 2. Database Setup

The database schema is already set up. No additional migrations needed.

### 3. Testing the System

#### Step 1: Start the Application
```bash
cd frontend
npm run dev
```

#### Step 2: Enable Email Alerts
1. Go to `http://localhost:3000/profile`
2. Sign in with your account
3. Scroll to "Email Alerts" section
4. Toggle "Email Notifications" ON
5. Configure your preferences:
   - Frequency: Daily
   - Max Dogs: 5
   - Min Match Score: 70%
   - Include Photos: ON
   - Include Reasoning: ON

#### Step 3: Send Test Email
1. Click "Send Test Email" button
2. Enter your email address
3. Click "Send Test"
4. Check your email inbox

#### Step 4: Test Cron Job (Manual)
```bash
curl -X POST "http://localhost:3000/api/cron/email-alerts" \
  -H "Authorization: Bearer your-cron-secret-here"
```

### 4. Production Setup

#### Cron Job Configuration
Set up a cron job on your server to run daily at 12pm Eastern (5pm UTC):

```bash
# Add to your server's crontab
0 17 * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://dogyenta.com/api/cron/email-alerts
```

#### Domain Configuration
1. **DNS Setup**: Ensure dogyenta.com points to your server
2. **SSL Certificate**: Ensure HTTPS is working
3. **Resend Domain**: Verify dogyenta.com in Resend dashboard

### 5. Monitoring Setup

#### Email Analytics
- Monitor email delivery rates in Resend dashboard
- Track open and click rates
- Monitor unsubscribe rates

#### System Monitoring
- Set up alerts for cron job failures
- Monitor database performance
- Track error rates in email sending

### 6. Troubleshooting

#### Common Issues

**Emails not sending:**
- Check RESEND_API_KEY is correct
- Verify domain is set up in Resend
- Check server logs for errors

**Cron job not working:**
- Verify CRON_SECRET is set correctly
- Check cron job syntax and timing
- Monitor server logs

**Database errors:**
- Ensure Supabase connection is working
- Check user authentication
- Verify database schema is up to date

#### Debug Mode
Enable detailed logging:
```bash
NODE_ENV=development
```

### 7. Testing Checklist

#### Basic Functionality
- [ ] User can enable/disable email alerts
- [ ] Settings save and load correctly
- [ ] Test email sends successfully
- [ ] Email content is correct
- [ ] Unsubscribe link works

#### Advanced Testing
- [ ] Cron job processes users correctly
- [ ] Already-seen dogs are filtered out
- [ ] Rate limiting works (one email per day)
- [ ] Error handling works properly
- [ ] Email templates render correctly

#### Production Readiness
- [ ] Domain is properly configured
- [ ] SSL certificate is valid
- [ ] Cron job is scheduled correctly
- [ ] Monitoring is set up
- [ ] Error alerting is configured

### 8. Next Steps

After basic setup:
1. **Test thoroughly** using the comprehensive test plan
2. **Monitor performance** and email delivery rates
3. **Gather user feedback** on email content and timing
4. **Optimize** based on usage patterns
5. **Scale** as user base grows

---

**Need Help?** Check the comprehensive test plan in `MODULE_6_TEST_PLAN.md` for detailed testing procedures.

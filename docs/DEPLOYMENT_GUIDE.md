# Deployment Guide

This guide covers deploying DogYenta to various platforms and environments.

## 🚀 Quick Deploy to Vercel (Recommended)

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel
- All required environment variables

### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `frontend` folder as the root directory

### 2. Configure Environment Variables
Add all required environment variables in Vercel dashboard:

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.vercel.app

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Email
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=theyenta@dogyenta.com
EMAIL_REPLY_TO=support@dogyenta.com
EMAIL_DOMAIN=dogyenta.com

# AI
OPENAI_API_KEY=your_openai_api_key

# Cron
CRON_SECRET_PROD=your_prod_cron_secret
CRON_SECRET_STAGING=your_staging_cron_secret

# Admin
ADMIN_SECRET=your_admin_secret
```

### 3. Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Configure custom domain (optional)

## 🔧 Environment-Specific Configuration

### Staging Environment
- **Branch**: `staging`
- **URL**: `https://staging.dogyenta.com`
- **Environment**: `VERCEL_ENV=preview`

### Production Environment
- **Branch**: `main`
- **URL**: `https://dogyenta.com`
- **Environment**: `VERCEL_ENV=production`

## 🗄️ Database Setup

### Supabase Configuration
1. Create a new Supabase project
2. Run the database migration:
   ```sql
   -- The migration is automatically applied on first deployment
   -- See: frontend/migrations/1760029096430_initial-schema.js
   ```
3. Enable Row Level Security (RLS) on all tables
4. Configure authentication providers

### Required Tables
- `users` - User accounts and profiles
- `plans` - Subscription plans and billing
- `preferences` - User search preferences
- `alert_settings` - Email alert configurations
- `email_events` - Email delivery tracking
- `webhook_events` - Stripe webhook audit trail
- `dog_cache` - Cached dog data for performance

## 📧 Email Configuration

### Resend Setup
1. Create a Resend account
2. Verify your domain (`dogyenta.com`)
3. Generate API key
4. Configure DNS records:
   ```
   TXT record: v=spf1 include:resend.com ~all
   CNAME record: resend._domainkey -> resend.com
   ```

### Email Templates
- **Dog Match Alerts**: Automated notifications
- **Test Emails**: User testing functionality
- **Trial Notifications**: Subscription lifecycle emails

## 💳 Payment Configuration

### Stripe Setup
1. Create a Stripe account
2. Get API keys from dashboard
3. Create products and prices:
   ```bash
   # Create Pro plan
   stripe products create --name "DogYenta Pro"
   stripe prices create --product prod_xxx --unit-amount 999 --currency usd --recurring interval=month
   ```
4. Configure webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

## 🤖 AI Configuration

### OpenAI Setup
1. Create OpenAI account
2. Generate API key
3. Configure usage limits and billing
4. Test API connectivity:
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
   ```

## ⏰ Cron Jobs

### Vercel Cron Configuration
The `vercel.json` file configures automatic cron jobs:

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

### Manual Cron Testing
```bash
# Test cron endpoint
curl -X POST https://your-domain.com/api/cron/email-alerts \
  -H "Authorization: Bearer $CRON_SECRET_PROD"
```

## 🔐 Security Configuration

### Environment Variables Security
- Use Vercel's environment variable encryption
- Never commit secrets to repository
- Use different secrets for staging/production
- Rotate secrets regularly

### CORS Configuration
```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://dogyenta.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

## 📊 Monitoring Setup

### Health Checks
- **Endpoint**: `/api/health`
- **Monitoring**: Uptime monitoring service
- **Alerts**: Email/SMS notifications for downtime

### Error Tracking
- **Logging**: Vercel function logs
- **Monitoring**: Error tracking service (optional)
- **Alerts**: Critical error notifications

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Domain DNS configured
- [ ] SSL certificates valid
- [ ] Stripe webhooks configured
- [ ] Email domain verified
- [ ] Cron jobs scheduled

### Post-Deployment
- [ ] Health check passes
- [ ] Authentication working
- [ ] Payment processing tested
- [ ] Email sending verified
- [ ] Cron jobs executing
- [ ] API documentation accessible
- [ ] Error monitoring active

## 🔄 Rollback Procedure

### Emergency Rollback
1. Go to Vercel dashboard
2. Navigate to project deployments
3. Select previous stable deployment
4. Click "Promote to Production"
5. Verify functionality

### Database Rollback
```sql
-- If needed, rollback database changes
-- (Use with caution - test in staging first)
```

## 🧪 Testing Deployment

### Smoke Tests
```bash
# Health check
curl https://your-domain.com/api/health

# Authentication
curl https://your-domain.com/api/auth/signin

# API documentation
curl https://your-domain.com/api/docs
```

### Integration Tests
```bash
# Run full test suite
npm test

# Run module-specific tests
node scripts/test-module3.js
node scripts/test-module4.js
node scripts/test-module5.js
```

## 📈 Performance Optimization

### Vercel Optimizations
- Enable Vercel Analytics
- Configure Edge Functions for global performance
- Use Vercel Image Optimization
- Enable Automatic HTTPS

### Database Optimizations
- Configure connection pooling
- Set up read replicas (if needed)
- Monitor query performance
- Implement caching strategies

## 🐛 Troubleshooting

### Common Issues

**Build Failures**
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Import/export issues
```

**Runtime Errors**
```bash
# Check function logs in Vercel dashboard
# Common issues:
# - Database connection problems
# - API key issues
# - CORS problems
```

**Email Not Sending**
```bash
# Check Resend dashboard for delivery status
# Verify domain configuration
# Test with curl:
curl -X POST https://your-domain.com/api/email-alerts \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Getting Help
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **Stripe Support**: [stripe.com/support](https://stripe.com/support)
- **GitHub Issues**: [github.com/samshaps/dogfinder-web/issues](https://github.com/samshaps/dogfinder-web/issues)

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Resend Documentation](https://resend.com/docs)

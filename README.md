# DogYenta - AI-Powered Dog Adoption Platform

[![Deployment Status](https://img.shields.io/badge/deployment-staging%20%7C%20production-green)](https://staging.dogyenta.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0-38B2AC)](https://tailwindcss.com/)

> **Find your perfect furry companion with AI-powered matching and intelligent email alerts**

DogYenta is a modern web application that helps users find their ideal dog through intelligent matching algorithms, comprehensive breed analysis, and personalized email notifications. Built with Next.js, TypeScript, and powered by AI.

## 🚀 Features

### 🐕 **Smart Dog Matching**
- **AI-Powered Analysis**: Advanced algorithms analyze breed temperaments, energy levels, and compatibility
- **Comprehensive Search**: Filter by breed, size, age, energy level, and location
- **Intelligent Scoring**: Match percentage based on user preferences and dog characteristics
- **Visual Results**: High-quality photos and detailed dog profiles

### 📧 **Email Alerts (Pro Feature)**
- **Personalized Notifications**: Get notified when new dogs match your criteria
- **Customizable Frequency**: Daily or weekly email alerts
- **Smart Filtering**: Only receive alerts for dogs above your minimum match score
- **Rich Content**: Includes photos, AI reasoning, and detailed match explanations

### 💳 **Subscription Management**
- **Free Tier**: Basic search functionality with limited features
- **Pro Tier**: Email alerts, unlimited searches, and premium features
- **Secure Payments**: Stripe-powered subscription management
- **Easy Cancellation**: One-click unsubscribe with automatic plan downgrade

### 🔐 **Authentication & Security**
- **OAuth Integration**: Sign in with Google, GitHub, and other providers
- **Secure API**: Rate limiting, input validation, and comprehensive error handling
- **Privacy-First**: User data protection and secure token management

## 🏗️ Architecture

### **Frontend (Next.js 15)**
- **Framework**: Next.js with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks and context
- **Authentication**: NextAuth.js with multiple providers

### **Backend Services**
- **Database**: Supabase (PostgreSQL)
- **Email Service**: Resend for transactional emails
- **Payments**: Stripe for subscription management
- **AI Integration**: OpenAI for intelligent matching
- **Cron Jobs**: Vercel Cron for scheduled email alerts

### **API Structure**
- **RESTful Design**: Standardized API responses and error handling
- **Rate Limiting**: Built-in protection against abuse
- **Versioning**: API version management and deprecation handling
- **Documentation**: Auto-generated OpenAPI 3.0 documentation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account
- Stripe account (for payments)
- Resend account (for emails)

### 1. Clone the Repository
```bash
git clone https://github.com/samshaps/dogfinder-web.git
cd dogfinder-web
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Environment Setup
Copy the environment template and configure your variables:

```bash
cp ENV_TEMPLATE.txt .env.local
```

Required environment variables:
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Email
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=theyenta@dogyenta.com

# AI
OPENAI_API_KEY=your_openai_api_key

# Cron
CRON_SECRET_PROD=your_prod_cron_secret
CRON_SECRET_STAGING=your_staging_cron_secret
```

### 4. Database Setup
Run the database migrations:

```bash
# The migration will be automatically applied on first run
npm run dev
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📚 Documentation

### **API Documentation**
- **Live API Docs**: [https://staging.dogyenta.com/api/docs](https://staging.dogyenta.com/api/docs)
- **OpenAPI Spec**: [https://staging.dogyenta.com/api/docs?format=json](https://staging.dogyenta.com/api/docs?format=json)

### **Setup Guides**
- [Email Alerts Setup Guide](docs/EMAIL_ALERTS_SETUP_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Development Setup](docs/DEVELOPMENT_SETUP.md)

### **Module Documentation**
- [Module 1: Config & Types Foundation](docs/v2_refactor.md#module-1-config--types-foundation)
- [Module 2: Email + Cron Hardening](docs/v2_refactor.md#module-2-email--cron-hardening)
- [Module 3: Plan Sync + Billing](docs/v2_refactor.md#module-3-plan-sync--billing)
- [Module 4: API Structure](docs/v2_refactor.md#module-4-api-structure)
- [Module 5: UI/UX & A11y Polish](docs/v2_refactor.md#module-5-uiux--a11y-polish)

## 🧪 Testing

### **Run All Tests**
```bash
# Frontend tests
npm test

# Module-specific tests
node scripts/test-module3.js  # Plan sync & billing
node scripts/test-module4.js  # API structure
node scripts/test-module5.js  # UI/UX & accessibility
```

### **Test Coverage**
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing
- **Module Tests**: Comprehensive feature testing

## 🚀 Deployment

### **Staging Environment**
- **URL**: [https://staging.dogyenta.com](https://staging.dogyenta.com)
- **Branch**: `staging`
- **Auto-deploy**: On push to staging branch

### **Production Environment**
- **URL**: [https://dogyenta.com](https://dogyenta.com)
- **Branch**: `main`
- **Deploy**: Manual deployment from main branch

### **Environment Variables**
Ensure all required environment variables are set in your deployment platform:
- Vercel (recommended)
- Netlify
- Railway
- Self-hosted

## 🏗️ Project Structure

```
dogfinder-app/
├── frontend/                 # Next.js application
│   ├── app/                 # App Router pages and API routes
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utility libraries and configurations
│   ├── scripts/             # Testing and utility scripts
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper functions
├── docs/                    # Documentation files
├── backend/                 # Backend services (if applicable)
└── README.md               # This file
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### **Development Workflow**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commit messages

## 📊 Monitoring & Analytics

### **Application Monitoring**
- **Health Checks**: `/api/health` endpoint
- **Error Tracking**: Comprehensive error logging
- **Performance**: Response time monitoring

### **User Analytics**
- **Privacy-First**: No personal data collection
- **Usage Metrics**: Anonymous usage statistics
- **Feature Adoption**: Track feature usage patterns

## 🔒 Security

### **Security Measures**
- **HTTPS**: All traffic encrypted
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Comprehensive data sanitization
- **Authentication**: Secure OAuth integration
- **Data Protection**: GDPR-compliant data handling

### **Security Headers**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## 📈 Performance

### **Optimization Features**
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic bundle splitting
- **Caching**: Strategic caching for better performance
- **CDN**: Global content delivery

### **Performance Metrics**
- **Lighthouse Score**: 90+ across all categories
- **Core Web Vitals**: Optimized for user experience
- **Load Time**: < 2 seconds initial load

## 🐛 Troubleshooting

### **Common Issues**

**Database Connection Issues**
```bash
# Check Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

**Email Not Sending**
```bash
# Test email configuration
node scripts/test-email.js
```

**Stripe Webhook Issues**
```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/api/stripe/webhook
```

### **Getting Help**
- **Issues**: [GitHub Issues](https://github.com/samshaps/dogfinder-web/issues)
- **Discussions**: [GitHub Discussions](https://github.com/samshaps/dogfinder-web/discussions)
- **Email**: support@dogyenta.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team**: For the amazing framework
- **Supabase**: For the backend-as-a-service platform
- **Stripe**: For payment processing
- **Resend**: For email delivery
- **OpenAI**: For AI capabilities
- **Tailwind CSS**: For the utility-first CSS framework

---

**Made with ❤️ for dog lovers everywhere**

*Find your perfect match at [dogyenta.com](https://dogyenta.com)*

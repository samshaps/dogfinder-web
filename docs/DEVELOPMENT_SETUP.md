# Development Setup Guide

This guide helps developers set up a local development environment for DogYenta.

## 🛠️ Prerequisites

### Required Software
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher (or yarn/pnpm)
- **Git**: Latest version
- **Code Editor**: VS Code (recommended) or your preferred editor

### Required Accounts
- **GitHub**: For repository access
- **Supabase**: For database services
- **Stripe**: For payment processing (test mode)
- **Resend**: For email services
- **OpenAI**: For AI features

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/samshaps/dogfinder-web.git
cd dogfinder-web
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Environment Configuration
```bash
# Copy environment template
cp ENV_TEMPLATE.txt .env.local

# Edit with your values
nano .env.local
```

### 4. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🔧 Environment Variables

### Required Variables
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=theyenta@dogyenta.com

# AI
OPENAI_API_KEY=sk-...

# Development
NODE_ENV=development
```

### Optional Variables
```env
# Admin
ADMIN_SECRET=your_admin_secret

# Cron (for testing)
CRON_SECRET_STAGING=your_staging_cron_secret

# API Base URL (if using external backend)
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## 🗄️ Database Setup

### Supabase Local Development
1. Create a new Supabase project
2. Go to Settings > API
3. Copy your project URL and anon key
4. Go to Settings > Database
5. Copy your service role key

### Database Schema
The database schema is automatically applied on first run. If you need to reset:

```sql
-- Run this in Supabase SQL editor
-- (The migration is in frontend/migrations/1760029096430_initial-schema.js)
```

### Test Data
```sql
-- Insert test user
INSERT INTO users (id, email, name, provider) 
VALUES ('test-user-id', 'test@example.com', 'Test User', 'google');

-- Insert test preferences
INSERT INTO preferences (user_id, zip_codes, radius_mi, breeds, sizes, ages, energy_levels)
VALUES ('test-user-id', '{"10001"}', 25, '{"Golden Retriever"}', '{"Medium"}', '{"Adult"}', '{"Medium"}');
```

## 💳 Payment Setup (Test Mode)

### Stripe Test Configuration
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test)
2. Get your test API keys
3. Create test products:
   ```bash
   # Install Stripe CLI
   npm install -g @stripe/stripe-cli
   
   # Create test product
   stripe products create --name "DogYenta Pro Test" --type service
   stripe prices create --product prod_xxx --unit-amount 999 --currency usd --recurring interval=month
   ```

### Webhook Testing
```bash
# Install Stripe CLI
npm install -g @stripe/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 📧 Email Setup

### Resend Configuration
1. Create a [Resend account](https://resend.com)
2. Generate an API key
3. Verify your domain (optional for development)
4. Test email sending:
   ```bash
   curl -X POST http://localhost:3000/api/email-alerts \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

## 🤖 AI Setup

### OpenAI Configuration
1. Create an [OpenAI account](https://platform.openai.com)
2. Generate an API key
3. Add credits to your account
4. Test API connectivity:
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
   ```

## 🧪 Testing

### Run All Tests
```bash
# Unit tests
npm test

# Module-specific tests
node scripts/test-module3.js
node scripts/test-module4.js
node scripts/test-module5.js

# E2E tests (if configured)
npm run test:e2e
```

### Test Individual Components
```bash
# Test specific file
npm test -- --testPathPattern=email-alerts

# Test with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 🔍 Development Tools

### VS Code Extensions (Recommended)
- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Tailwind CSS IntelliSense**
- **Prettier - Code formatter**
- **ESLint**
- **GitLens**

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  }
}
```

## 🏗️ Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── find/              # Search functionality
│   ├── profile/           # User profile
│   └── unsubscribe/       # Email unsubscribe
├── components/            # Reusable components
├── lib/                   # Utility libraries
│   ├── api/              # API utilities
│   ├── auth/             # Authentication
│   ├── email/            # Email services
│   └── stripe/           # Payment processing
├── scripts/              # Development scripts
├── types/                # TypeScript definitions
└── utils/                # Helper functions
```

## 🐛 Debugging

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

**Database Connection Issues**
```bash
# Check Supabase connection
curl https://your-project.supabase.co/rest/v1/

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

**TypeScript Errors**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Fix common issues
npm run lint:fix
```

**Build Failures**
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Enable specific debug namespaces
DEBUG=next:* npm run dev
```

## 📝 Code Standards

### TypeScript
- Use strict type checking
- Define interfaces for all data structures
- Use proper type annotations
- Avoid `any` type when possible

### React
- Use functional components with hooks
- Implement proper error boundaries
- Use proper key props for lists
- Follow React best practices

### Styling
- Use Tailwind CSS classes
- Follow mobile-first approach
- Use consistent spacing and colors
- Implement responsive design

### Git
- Use conventional commit messages
- Create feature branches
- Write descriptive commit messages
- Use pull requests for code review

## 🚀 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ... code changes ...

# Test changes
npm test

# Commit changes
git add .
git commit -m "feat: add your feature description"

# Push branch
git push origin feature/your-feature-name
```

### 2. Code Review
- Create pull request
- Request review from team members
- Address feedback
- Merge after approval

### 3. Deployment
- Merge to `staging` for testing
- Merge to `main` for production
- Monitor deployment status

## 🔧 Useful Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm test             # Run tests
npm test:watch       # Run tests in watch mode
```

### Database
```bash
# Reset database (careful!)
npm run db:reset

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed
```

### Utilities
```bash
# Generate types from Supabase
npm run generate:types

# Validate environment variables
npm run validate:env

# Test email configuration
npm run test:email
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Resend Documentation](https://resend.com/docs)

## 🤝 Getting Help

- **GitHub Issues**: [github.com/samshaps/dogfinder-web/issues](https://github.com/samshaps/dogfinder-web/issues)
- **GitHub Discussions**: [github.com/samshaps/dogfinder-web/discussions](https://github.com/samshaps/dogfinder-web/discussions)
- **Email**: support@dogyenta.com

---

Happy coding! 🐕✨

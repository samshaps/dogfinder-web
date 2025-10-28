type Env = 'development' | 'test' | 'production';

function get(name: string, required = true): string | undefined {
  const v = process.env[name];
  if (required && (!v || v.trim() === '')) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

export const appConfig = {
  nodeEnv: (process.env.NODE_ENV as Env) || 'development',
  vercelEnv: process.env.VERCEL_ENV,

  // Supabase
  supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL')!,
  supabaseAnonKey: get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!,

  // Stripe
  stripePublishableKey: get('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  stripeSecretKey: get('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: get('STRIPE_WEBHOOK_SECRET', false),
  stripeProPriceId: get('STRIPE_PRO_PRICE_ID', false),

  // Resend
  resendApiKey: get('RESEND_API_KEY'),
  emailFrom: get('EMAIL_FROM') || 'theyenta@dogyenta.com',
  emailReplyTo: get('EMAIL_REPLY_TO', false) || 'support@dogyenta.com',
  emailUnsubscribeBase: get('EMAIL_UNSUBSCRIBE_URL') || 'https://dogyenta.com/unsubscribe',
  dashboardUrl: get('DASHBOARD_URL', false) || 'https://dogyenta.com/profile',

  // Tokens / Secrets
  emailTokenSecret: get('EMAIL_TOKEN_SECRET'),

  // Cron
  cronSecretProd: get('CRON_SECRET_PROD', false),
  cronSecretStaging: get('CRON_SECRET_STAGING', false),
  publicBaseUrl: get('NEXT_PUBLIC_BASE_URL', false),
} as const;

export function redact(value?: string) {
  if (!value) return value;
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}



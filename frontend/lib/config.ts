type Env = 'development' | 'test' | 'production';

const isBrowser = typeof window !== 'undefined';

const browserEnv: Record<string, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_UMAMI_SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL,
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_FEATURE_ANALYTICS: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS,
};

const envSource: Record<string, string | undefined> = isBrowser
  ? browserEnv
  : process.env;

function get(name: string, required = true): string | undefined {
  const v = envSource[name];
  if (required && (!v || v.trim() === '')) {
    throw new Error(`${name} is not set`);
  }
  return v?.trim();
}

const stripeModeRaw = (envSource.STRIPE_MODE ?? 'test').toLowerCase();
export type StripeMode = 'test' | 'live';
const stripeMode: StripeMode = stripeModeRaw === 'live' ? 'live' : 'test';

interface StripeValueOptions {
  liveKey: string;
  testKey: string;
  legacyKey?: string;
  required?: boolean;
  label: string;
}

function getStripeValue({
  liveKey,
  testKey,
  legacyKey,
  required = true,
  label,
}: StripeValueOptions): string | undefined {
  const primaryKey = stripeMode === 'live' ? liveKey : testKey;
  const fallbackKey = legacyKey;
  const value =
    envSource[primaryKey] ??
    (fallbackKey ? envSource[fallbackKey] : undefined);

  if (required && (!value || value.trim() === '')) {
    const expected = fallbackKey
      ? `${primaryKey} (or ${fallbackKey})`
      : primaryKey;
    throw new Error(`${label} is not set. Expected ${expected}`);
  }

  return value?.trim();
}

export const appConfig = {
  nodeEnv: (process.env.NODE_ENV as Env) || 'development',
  vercelEnv: process.env.VERCEL_ENV,

  // Supabase
  supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL')!,
  supabaseAnonKey: get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!,

  // Analytics
  umamiScriptUrl: get('NEXT_PUBLIC_UMAMI_SCRIPT_URL', false),
  umamiWebsiteId: get('NEXT_PUBLIC_UMAMI_WEBSITE_ID', false),

  // Stripe
  stripeMode,
  stripePublishableKey: getStripeValue({
    liveKey: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE',
    testKey: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST',
    legacyKey: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    label: 'Stripe publishable key',
  })!,
  stripeSecretKey: isBrowser
    ? undefined
    : getStripeValue({
        liveKey: 'STRIPE_SECRET_KEY_LIVE',
        testKey: 'STRIPE_SECRET_KEY_TEST',
        legacyKey: 'STRIPE_SECRET_KEY',
        label: 'Stripe secret key',
      })!,
  stripeWebhookSecret: isBrowser
    ? undefined
    : getStripeValue({
        liveKey: 'STRIPE_WEBHOOK_SECRET_LIVE',
        testKey: 'STRIPE_WEBHOOK_SECRET_TEST',
        legacyKey: 'STRIPE_WEBHOOK_SECRET',
        required: false,
        label: 'Stripe webhook secret',
      }),
  stripeProPriceId: isBrowser
    ? undefined
    : getStripeValue({
        liveKey: 'STRIPE_PRO_PRICE_ID_LIVE',
        testKey: 'STRIPE_PRO_PRICE_ID_TEST',
        legacyKey: 'STRIPE_PRO_PRICE_ID',
        required: false,
        label: 'Stripe Pro price id',
      }),

  // Resend
  resendApiKey: isBrowser ? undefined : get('RESEND_API_KEY'),
  emailFrom: get('EMAIL_FROM') || 'theyenta@dogyenta.com',
  emailReplyTo: get('EMAIL_REPLY_TO', false) || 'support@dogyenta.com',
  emailUnsubscribeBase: get('EMAIL_UNSUBSCRIBE_URL') || 'https://dogyenta.com/unsubscribe',
  dashboardUrl: get('DASHBOARD_URL', false) || 'https://dogyenta.com/profile',

  // Tokens / Secrets
  emailTokenSecret: isBrowser ? undefined : get('EMAIL_TOKEN_SECRET'),

  // Cron
  cronSecretProd: isBrowser ? undefined : get('CRON_SECRET_PROD', false),
  cronSecretStaging: isBrowser ? undefined : get('CRON_SECRET_STAGING', false),
  publicBaseUrl: get('NEXT_PUBLIC_BASE_URL', false),
} as const;

export function redact(value?: string) {
  if (!value) return value;
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}



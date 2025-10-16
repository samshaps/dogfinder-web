import { Resend } from 'resend';

// Initialize Resend client
let resend: Resend | null = null;

export function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    resend = new Resend(apiKey);
  }

  return resend;
}

// Email configuration
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'theyenta@dogyenta.com',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@dogyenta.com',
  domain: process.env.EMAIL_DOMAIN || 'dogyenta.com',
  unsubscribeUrl: process.env.EMAIL_UNSUBSCRIBE_URL || 'https://dogyenta.com/unsubscribe',
  dashboardUrl: process.env.DASHBOARD_URL || 'https://dogyenta.com/profile',
} as const;

// Rate limiting configuration - simplified for daily emails
export const RATE_LIMITS = {
  maxEmailsPerUserPerDay: 1, // One email per day at 12pm Eastern
  cooldownMinutes: 24 * 60, // 24 hours between emails
} as const;

// Email templates configuration
export const TEMPLATE_CONFIG = {
  maxDogsPerEmail: 5,
  includePhotos: true,
  includeReasoning: true,
  minMatchScore: 70,
} as const;

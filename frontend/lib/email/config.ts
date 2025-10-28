import { Resend } from 'resend';

// Initialize Resend client
export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is missing!');
    throw new Error('RESEND_API_KEY environment variable is required');
  }
  
  return new Resend(apiKey);
}

// Email configuration
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'theyenta@dogyenta.com',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@dogyenta.com',
  domain: process.env.EMAIL_DOMAIN || 'dogyenta.com',
  unsubscribeUrl: process.env.EMAIL_UNSUBSCRIBE_URL || 'https://dogyenta.com/unsubscribe',
  dashboardUrl: process.env.DASHBOARD_URL || 'https://dogyenta.com/profile',
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  maxEmailsPerUserPerDay: 1, // One email per day at 12pm Eastern
  cooldownMinutes: 24 * 60, // 24 hours between emails
} as const;


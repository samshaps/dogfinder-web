import { Resend } from 'resend';

// Initialize Resend client
export function getResendClient(): Resend {
  console.log('🔑 getResendClient() called');
  const apiKey = process.env.RESEND_API_KEY;
  
  console.log('🔑 RESEND_API_KEY check:', {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey?.substring(0, 7) || 'N/A',
  });
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is missing!');
    throw new Error('RESEND_API_KEY environment variable is required');
  }
  
  console.log('🔑 Creating Resend client instance...');
  const client = new Resend(apiKey);
  console.log('🔑 Resend client created successfully');
  
  return client;
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


import { z } from 'zod';

// Email alert preferences schema
export const EmailAlertPreferencesSchema = z.object({
  enabled: z.boolean().default(false),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  maxDogsPerEmail: z.number().min(1).max(10).default(5),
  minMatchScore: z.number().min(0).max(100).default(70),
  includePhotos: z.boolean().default(true),
  includeReasoning: z.boolean().default(true),
});

export type EmailAlertPreferences = z.infer<typeof EmailAlertPreferencesSchema>;

// Email event types
export type EmailEventType = 
  | 'alert_sent'
  | 'alert_failed'
  | 'alert_bounced'
  | 'alert_complained'
  | 'alert_unsubscribed'
  | 'test_email';

// Email event schema
export const EmailEventSchema = z.object({
  userId: z.string().uuid(),
  eventType: z.enum(['alert_sent', 'alert_failed', 'alert_bounced', 'alert_complained', 'alert_unsubscribed', 'test_email']),
  emailProvider: z.string().optional(),
  messageId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type EmailEvent = z.infer<typeof EmailEventSchema>;

// Dog match for email
export interface EmailDogMatch {
  id: string;
  name: string;
  breeds: string[];
  age: string;
  size: string;
  energy: string;
  temperament: string[];
  location: {
    city: string;
    state: string;
    distanceMi?: number;
  };
  photos: string[];
  matchScore: number;
  reasons: {
    primary150?: string;
    blurb50?: string;
  };
  shelter: {
    name: string;
    email?: string;
    phone?: string;
  };
  url: string;
}

// Email template data
export interface EmailTemplateData {
  user: {
    name: string;
    email: string;
  };
  preferences: {
    zipCodes: string[];
    radiusMi: number;
    frequency: string;
  };
  matches: EmailDogMatch[];
  unsubscribeUrl: string;
  dashboardUrl: string;
  totalMatches: number;
  generatedAt: string;
}

// Email service response
export interface EmailServiceResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

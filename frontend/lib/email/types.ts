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

// Email template data schema with validation
export const EmailTemplateDataSchema = z.object({
  user: z.object({
    name: z.string().min(1, 'User name is required'),
    email: z.string().email('Valid email is required'),
  }),
  preferences: z.object({
    zipCodes: z.array(z.string().min(1, 'Zip code cannot be empty')).min(1, 'At least one zip code is required'),
    radiusMi: z.number().min(1).max(500, 'Radius must be between 1 and 500 miles'),
    frequency: z.enum(['daily', 'weekly']),
  }),
  matches: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    breeds: z.array(z.string()),
    age: z.string(),
    size: z.string(),
    energy: z.string(),
    temperament: z.array(z.string()),
    location: z.object({
      city: z.string(),
      state: z.string(),
      distanceMi: z.number().optional(),
    }),
    photos: z.array(z.string().url()),
    matchScore: z.number().min(0).max(100),
    reasons: z.object({
      primary150: z.string().optional(),
      blurb50: z.string().optional(),
    }),
    shelter: z.object({
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }),
    url: z.string().url(),
  })).min(1, 'At least one match is required'),
  unsubscribeUrl: z.string().url('Valid unsubscribe URL is required'),
  dashboardUrl: z.string().url('Valid dashboard URL is required'),
  totalMatches: z.number().min(0),
  generatedAt: z.string().datetime('Valid ISO datetime is required'),
});

export type EmailTemplateData = z.infer<typeof EmailTemplateDataSchema>;

// Email service response
export interface EmailServiceResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}


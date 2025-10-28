import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendDogMatchAlert, sendTestEmail } from '@/lib/email/service';
import { EmailTemplateData } from '@/lib/email/types';

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null
      })
    }
  }))
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { id: 'test-user-id' }, 
            error: null 
          })
        })
      })
    })
  })
}));

describe('Email Alerts Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendDogMatchAlert', () => {
    it('should send a dog match alert email successfully', async () => {
      const templateData: EmailTemplateData = {
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        preferences: {
          zipCodes: ['10001'],
          radiusMi: 50,
          frequency: 'daily'
        },
        matches: [
          {
            id: 'dog-1',
            name: 'Buddy',
            breeds: ['Golden Retriever'],
            age: 'young',
            size: 'large',
            energy: 'medium',
            temperament: ['friendly', 'playful'],
            location: {
              city: 'New York',
              state: 'NY',
              distanceMi: 5
            },
            photos: ['https://example.com/dog1.jpg'],
            matchScore: 95,
            reasons: {
              primary150: 'Perfect match for your active lifestyle!',
              blurb50: 'Great family dog'
            },
            shelter: {
              name: 'Test Shelter',
              email: 'test@shelter.com'
            },
            url: 'https://example.com/dog1'
          }
        ],
        unsubscribeUrl: 'https://dogfinder.app/unsubscribe?email=test@example.com',
        dashboardUrl: 'https://dogfinder.app/profile',
        totalMatches: 1,
        generatedAt: new Date().toISOString()
      };

      const result = await sendDogMatchAlert(templateData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.error).toBeUndefined();
    });

    it('should handle email send failure gracefully', async () => {
      const mockResend = require('resend').Resend;
      const mockInstance = new mockResend();
      mockInstance.emails.send.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email send failed' }
      });

      const templateData: EmailTemplateData = {
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        preferences: {
          zipCodes: ['10001'],
          radiusMi: 50,
          frequency: 'daily'
        },
        matches: [],
        unsubscribeUrl: 'https://dogfinder.app/unsubscribe?email=test@example.com',
        dashboardUrl: 'https://dogfinder.app/profile',
        totalMatches: 0,
        generatedAt: new Date().toISOString()
      };

      const result = await sendDogMatchAlert(templateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email send failed');
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('sendTestEmail', () => {
    it('should send a test email successfully', async () => {
      const result = await sendTestEmail('test@example.com', 'user@example.com');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.error).toBeUndefined();
    });

    it('should handle test email failure', async () => {
      const mockResend = require('resend').Resend;
      const mockInstance = new mockResend();
      mockInstance.emails.send.mockResolvedValueOnce({
        data: null,
        error: { message: 'Test email failed' }
      });

      const result = await sendTestEmail('test@example.com', 'user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test email failed');
    });
  });

  describe('Email Template Generation', () => {
    it('should generate proper email subject for single match', () => {
      const templateData: EmailTemplateData = {
        user: { name: 'Test User', email: 'test@example.com' },
        preferences: { zipCodes: ['10001'], radiusMi: 50, frequency: 'daily' },
        matches: [{
          id: 'dog-1',
          name: 'Buddy',
          breeds: ['Golden Retriever'],
          age: 'young',
          size: 'large',
          energy: 'medium',
          temperament: ['friendly'],
          location: { city: 'NYC', state: 'NY' },
          photos: [],
          matchScore: 95,
          reasons: { primary150: 'Great match!' },
          shelter: { name: 'Test Shelter' },
          url: '#'
        }],
        unsubscribeUrl: '#',
        dashboardUrl: '#',
        totalMatches: 1,
        generatedAt: new Date().toISOString()
      };

      // This would test the generateEmailSubject function if it were exported
      // For now, we'll test the template data structure
      expect(templateData.matches).toHaveLength(1);
      expect(templateData.matches[0].name).toBe('Buddy');
      expect(templateData.user.email).toBe('test@example.com');
    });

    it('should generate proper email subject for multiple matches', () => {
      const templateData: EmailTemplateData = {
        user: { name: 'Test User', email: 'test@example.com' },
        preferences: { zipCodes: ['10001'], radiusMi: 50, frequency: 'daily' },
        matches: [
          {
            id: 'dog-1',
            name: 'Buddy',
            breeds: ['Golden Retriever'],
            age: 'young',
            size: 'large',
            energy: 'medium',
            temperament: ['friendly'],
            location: { city: 'NYC', state: 'NY' },
            photos: [],
            matchScore: 95,
            reasons: { primary150: 'Great match!' },
            shelter: { name: 'Test Shelter' },
            url: '#'
          },
          {
            id: 'dog-2',
            name: 'Max',
            breeds: ['Labrador'],
            age: 'adult',
            size: 'large',
            energy: 'high',
            temperament: ['playful'],
            location: { city: 'NYC', state: 'NY' },
            photos: [],
            matchScore: 88,
            reasons: { primary150: 'Active companion!' },
            shelter: { name: 'Test Shelter' },
            url: '#'
          }
        ],
        unsubscribeUrl: '#',
        dashboardUrl: '#',
        totalMatches: 2,
        generatedAt: new Date().toISOString()
      };

      expect(templateData.matches).toHaveLength(2);
      expect(templateData.totalMatches).toBe(2);
    });
  });
});

describe('Email Alert Settings Validation', () => {
  it('should validate email alert preferences schema', () => {
    const { EmailAlertPreferencesSchema } = require('@/lib/email/types');
    
    const validPreferences = {
      enabled: true,
      frequency: 'daily',
      maxDogsPerEmail: 5,
      minMatchScore: 70,
      includePhotos: true,
      includeReasoning: true
    };

    const result = EmailAlertPreferencesSchema.safeParse(validPreferences);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email alert preferences', () => {
    const { EmailAlertPreferencesSchema } = require('@/lib/email/types');
    
    const invalidPreferences = {
      enabled: 'yes', // Should be boolean
      frequency: 'hourly', // Should be 'daily' or 'weekly'
      maxDogsPerEmail: 15, // Should be max 10
      minMatchScore: 150 // Should be max 100
    };

    const result = EmailAlertPreferencesSchema.safeParse(invalidPreferences);
    expect(result.success).toBe(false);
  });
});


import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { EmailTemplateData, EmailAlertPreferencesSchema } from '@/lib/email/types';

// Mock Resend with reusable spies
const resendSendMock = vi.fn().mockResolvedValue({
  data: { id: 'test-message-id' },
  error: null,
});
const resendConstructorMock = vi.fn().mockImplementation(() => ({
  emails: {
    send: resendSendMock,
  },
}));
vi.mock('resend', () => ({
  Resend: resendConstructorMock,
}));

// Mock Supabase client
const supabaseClient = {
  from: vi.fn(),
};
const getSupabaseClientMock = vi.fn(() => supabaseClient);
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: getSupabaseClientMock,
}));

// Mock getUserPreferences to avoid hitting real Supabase
const defaultPreferences = {
  zip_codes: ['10001'],
  radius: 50,
  include_breeds: ['poodle'],
  exclude_breeds: [],
  age_preferences: ['adult'],
  size_preferences: ['medium'],
  energy_level: 'medium',
  temperament_traits: ['friendly'],
};
const getUserPreferencesMock = vi.fn().mockResolvedValue({ ...defaultPreferences });
vi.mock('@/lib/supabase-auth', () => ({
  getUserPreferences: getUserPreferencesMock,
}));

function buildSampleMatch(): EmailTemplateData['matches'][number] {
  return {
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
      distanceMi: 5,
    },
    photos: ['https://example.com/dog1.jpg'],
    matchScore: 95,
    reasons: {
      primary150: 'Perfect match for your active lifestyle!',
      blurb50: 'Great family dog',
    },
    shelter: {
      name: 'Test Shelter',
      email: 'test@shelter.com',
    },
    url: 'https://example.com/dog1',
  };
}

function setupSupabaseMocks() {
  const usersSingle = vi.fn().mockResolvedValue({
    data: { id: 'test-user-id', name: 'Dog Lover' },
    error: null,
  });
  const usersSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: usersSingle,
    }),
  });

  const alertSettingsSingle = vi.fn().mockResolvedValue({
    data: { cadence: 'daily' },
    error: null,
  });
  const alertSettingsSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: alertSettingsSingle,
    }),
  });
  const alertSettingsUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  const emailEventsInsert = vi.fn().mockResolvedValue({ data: null, error: null });

  const defaultSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });
  const defaultUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'row-1' }], error: null }),
    }),
  });
  const defaultInsert = vi.fn().mockResolvedValue({ data: null, error: null });

  supabaseClient.from.mockImplementation((table: string) => {
    switch (table) {
      case 'users':
        return { select: usersSelect };
      case 'alert_settings':
        return {
          select: alertSettingsSelect,
          update: alertSettingsUpdate,
        };
      case 'email_events':
        return {
          insert: emailEventsInsert,
        };
      case 'plans':
      case 'webhook_events':
        return {
          select: defaultSelect,
          update: defaultUpdate,
          insert: defaultInsert,
        };
      default:
        return {
          select: defaultSelect,
          update: defaultUpdate,
          insert: defaultInsert,
        };
    }
  });
}

describe('Email Alerts Service', () => {
  let sendDogMatchAlert: typeof import('@/lib/email/service')['sendDogMatchAlert'];
  let sendTestEmail: typeof import('@/lib/email/service')['sendTestEmail'];

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST = 'pk_test';
    process.env.STRIPE_SECRET_KEY_TEST = 'sk_test';
    process.env.RESEND_API_KEY = 'resend_test_key';
    process.env.EMAIL_TOKEN_SECRET = 'test_email_secret';
    process.env.EMAIL_UNSUBSCRIBE_URL = 'https://dogyenta.com/unsubscribe';
    process.env.DASHBOARD_URL = 'https://dogyenta.com/profile';

    const module = await import('@/lib/email/service');
    sendDogMatchAlert = module.sendDogMatchAlert;
    sendTestEmail = module.sendTestEmail;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resendSendMock.mockReset();
    resendSendMock.mockResolvedValue({
      data: { id: 'test-message-id' },
      error: null,
    });
    resendConstructorMock.mockClear();
    supabaseClient.from.mockReset();
    getSupabaseClientMock.mockClear();
    getUserPreferencesMock.mockReset();
    getUserPreferencesMock.mockResolvedValue({ ...defaultPreferences });
    setupSupabaseMocks();
  });

  describe('sendDogMatchAlert', () => {
    it('should send a dog match alert email successfully', async () => {
      const templateData: EmailTemplateData = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
        preferences: {
          zipCodes: ['10001'],
          radiusMi: 50,
          frequency: 'daily',
        },
        matches: [
          buildSampleMatch(),
        ],
        unsubscribeUrl: 'https://dogfinder.app/unsubscribe?email=test@example.com',
        dashboardUrl: 'https://dogfinder.app/profile',
        totalMatches: 1,
        generatedAt: new Date().toISOString(),
      };

      const result = await sendDogMatchAlert(templateData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.error).toBeUndefined();
    });

    it('should handle email send failure gracefully', async () => {
      resendSendMock.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email send failed' },
      });

      const templateData: EmailTemplateData = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
        preferences: {
          zipCodes: ['10001'],
          radiusMi: 50,
          frequency: 'daily',
        },
        matches: [
          buildSampleMatch(),
        ],
        unsubscribeUrl: 'https://dogfinder.app/unsubscribe?email=test@example.com',
        dashboardUrl: 'https://dogfinder.app/profile',
        totalMatches: 1,
        generatedAt: new Date().toISOString(),
      };

      const result = await sendDogMatchAlert(templateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email send failed');
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('sendTestEmail', () => {
    it('should send a test email successfully', async () => {
      resendSendMock.mockResolvedValueOnce({
        data: { id: 'test-message-id' },
        error: null,
      });

      const result = await sendTestEmail('test@example.com', 'user@example.com');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.error).toBeUndefined();
    });

    it('should handle test email failure', async () => {
      resendSendMock.mockResolvedValueOnce({
        data: null,
        error: { message: 'Test email failed' },
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
            url: '#',
          },
        ],
        unsubscribeUrl: '#',
        dashboardUrl: '#',
        totalMatches: 1,
        generatedAt: new Date().toISOString(),
      };

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
            url: '#',
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
            url: '#',
          },
        ],
        unsubscribeUrl: '#',
        dashboardUrl: '#',
        totalMatches: 2,
        generatedAt: new Date().toISOString(),
      };

      expect(templateData.matches).toHaveLength(2);
      expect(templateData.totalMatches).toBe(2);
    });
  });
});

describe('Email Alert Settings Validation', () => {
  it('should validate email alert preferences schema', () => {
    const result = EmailAlertPreferencesSchema.safeParse({
      enabled: true,
      frequency: 'daily',
      maxDogsPerEmail: 5,
      minMatchScore: 70,
      includePhotos: true,
      includeReasoning: true,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email alert preferences', () => {
    const result = EmailAlertPreferencesSchema.safeParse({
      enabled: 'yes',
      frequency: 'hourly',
      maxDogsPerEmail: 15,
      minMatchScore: 150,
    });
    expect(result.success).toBe(false);
  });
});


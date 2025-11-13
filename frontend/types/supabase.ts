export type UserRow = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PlanRow = {
  user_id: string;
  plan_type: 'free' | 'pro' | string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  updated_at?: string;
};

export type AlertSettingsRow = {
  user_id: string;
  enabled: boolean;
  cadence: 'daily' | 'weekly' | string;
  last_sent_at_utc?: string | null;
  last_seen_ids?: string[] | null;
  paused_until?: string | null;
};

export type EmailEventRow = {
  id?: string;
  user_id: string;
  event_type: string;
  email_provider?: string | null;
  message_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
};

export type PreferencesRow = {
  user_id: string;
  location?: string | null;
  radius?: number | null;
  size?: string[] | null;
  age?: string[] | null;
  gender?: string | null;
  lifestyle?: any;
  updated_at?: string;
};



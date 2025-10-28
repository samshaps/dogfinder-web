/**
 * Analytics Event Types
 * 
 * Type definitions for all Umami events.
 * See /docs/metrics.md for full event dictionary.
 */

// Authentication events
export type AuthEvent = 
  | 'auth_login_clicked'
  | 'auth_login_success'
  | 'auth_logout'
  | 'auth_logout_clicked'
  | 'auth_page_viewed'
  | 'auth_protected_route_accessed'
  | 'auth_route_required';

// Pricing & Plans events
export type PricingEvent =
  | 'pricing_page_viewed'
  | 'pricing_cta_free'
  | 'pricing_cta_pro';

// Intake flow events
export type IntakeEvent =
  | 'find_started'
  | 'find_location_set'
  | 'find_preferences_saved'
  | 'find_submitted';

// Results page events
export type ResultsEvent =
  | 'results_viewed'
  | 'results_dog_clicked'
  | 'results_alert_toggled'
  | 'results_upgrade_clicked';

// Alert & Email events
export type AlertEvent =
  | 'alert_email_sent'
  | 'alert_email_opened'
  | 'alert_email_clicked'
  | 'alert_paused'
  | 'alert_unsubscribed'
  | 'alert_resumed';

// Payment events
export type PaymentEvent =
  | 'checkout_initiated'
  | 'checkout_success'
  | 'checkout_canceled'
  | 'subscription_canceled'
  | 'subscription_reactivated';

// Profile events
export type ProfileEvent =
  | 'profile_viewed'
  | 'profile_plan_changed'
  | 'preferences_saved'
  | 'preferences_viewed'
  | 'search_history_viewed'
  | 'profile_upgrade_clicked'
  | 'profile_downgrade_button_clicked'
  | 'profile_downgrade_initiated'
  | 'profile_downgrade_success'
  | 'profile_downgrade_failed'
  | 'pricing_cta_free'
  | 'pricing_cta_pro'
  | 'pricing_page_viewed';

// All event types
export type AnalyticsEvent =
  | AuthEvent
  | PricingEvent
  | IntakeEvent
  | ResultsEvent
  | AlertEvent
  | PaymentEvent
  | ProfileEvent;

// Event properties (no PII allowed!)
export interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}


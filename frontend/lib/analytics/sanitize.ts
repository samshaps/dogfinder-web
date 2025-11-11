/**
 * Analytics Sanitization
 * 
 * Removes PII and sensitive data from analytics events.
 * CRITICAL: Never log emails, full names, addresses, or dog IDs.
 */

import type { EventProperties } from './types';

// Patterns that indicate PII
const PII_PATTERNS = {
  email: /\S+@\S+\.\S+/,
  phone: /\d{3}[-.]?\d{3}[-.]?\d{4}/,
  uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
};

// Keys that should never be logged
const BLOCKED_KEYS = [
  'email',
  'name',
  'fullName',
  'firstName',
  'lastName',
  'address',
  'phone',
  'userId',
  'dogId',
  'petfinderId',
  'shelterId',
  'password',
  'token',
  'secret',
];

/**
 * Sanitize event properties to remove PII
 */
export function sanitizeEventProperties(
  properties: EventProperties
): EventProperties {
  const sanitized: EventProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    // Block keys that are known PII
    if (BLOCKED_KEYS.some(blocked => key.toLowerCase().includes(blocked))) {
      console.warn(`🚨 Blocked PII key from analytics: ${key}`);
      continue;
    }

    const lowerKey = key.toLowerCase();

    // Block values that look like PII
    if (typeof value === 'string') {
      let sanitizedKey = key;
      let sanitizedValue = value;

      if (PII_PATTERNS.email.test(value)) {
        console.warn(`🚨 Hashing email-like value for analytics key: ${key}`);
        sanitizedKey = lowerKey.endsWith('_hash') ? key : `${key}_hash`;
        sanitizedValue = hashForAnalytics(value);
        sanitized[sanitizedKey] = sanitizedValue;
        continue;
      }
      if (PII_PATTERNS.phone.test(value)) {
        console.warn(`🚨 Blocked phone-like value from analytics: ${key}`);
        continue;
      }
      // Allow UUIDs only for non-user identifiers (like session IDs)
      // But warn if it looks suspicious
      if (PII_PATTERNS.uuid.test(value) && key.toLowerCase().includes('user')) {
        console.warn(`🚨 Hashing UUID that might be user ID for analytics key: ${key}`);
        sanitizedKey = lowerKey.endsWith('_hash') ? key : `${key}_hash`;
        sanitizedValue = hashForAnalytics(value);
        sanitized[sanitizedKey] = sanitizedValue;
        continue;
      }
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Hash a value for analytics (one-way, non-reversible)
 */
export function hashForAnalytics(value: string): string {
  // Simple hash for non-sensitive use cases
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Log sanitization results in development
 */
export function logSanitization(
  original: EventProperties,
  sanitized: EventProperties
): void {
  if (process.env.NODE_ENV === 'development') {
    const removed = Object.keys(original).filter(
      key => !(key in sanitized)
    );
    if (removed.length > 0) {
      console.log('🧹 Sanitized analytics properties:', {
        removed,
        kept: Object.keys(sanitized),
      });
    }
  }
}


/**
 * Analytics Tracking
 * 
 * Umami event tracking with PII sanitization.
 * All events go through sanitization before being sent.
 */

import type { AnalyticsEvent, EventProperties } from './types';
import { sanitizeEventProperties, logSanitization } from './sanitize';

// Umami types (augment window)
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void;
    };
  }
}

// Event queue for tracking before Umami loads
const eventQueue: Array<{ eventName: string; properties?: EventProperties }> = [];

// Flag to track if Umami is ready
let umamiReady = false;

// Callback for when Umami loads
const onUmamiReady = () => {
  umamiReady = true;
  const queueLength = eventQueue.length;
  
  // Process queued events
  while (eventQueue.length > 0) {
    const { eventName, properties } = eventQueue.shift()!;
    trackEventInternal(eventName as AnalyticsEvent, properties);
  }
  
  if (process.env.NODE_ENV === 'development' && queueLength > 0) {
    console.log('📊 Umami ready, processed', queueLength, 'queued events');
  }
};

// Initialize Umami ready detection
if (typeof window !== 'undefined') {
  // Check if Umami is already loaded
  if (window.umami) {
    umamiReady = true;
  } else {
    // Poll for Umami to load
    const checkUmami = () => {
      if (window.umami && !umamiReady) {
        onUmamiReady();
      } else if (!umamiReady) {
        setTimeout(checkUmami, 50);
      }
    };
    setTimeout(checkUmami, 50);
  }
}

/**
 * Internal tracking function (called when Umami is ready)
 */
function trackEventInternal(
  eventName: AnalyticsEvent,
  properties?: EventProperties
): void {
  try {
    // Sanitize properties
    const sanitized = properties
      ? sanitizeEventProperties(properties)
      : undefined;

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Tracking event:', eventName, sanitized);
      if (properties) {
        logSanitization(properties, sanitized || {});
      }
    }

    // Track with Umami
    window.umami!.track(eventName, sanitized);
  } catch (error) {
    console.error('Failed to track event:', eventName, error);
  }
}

/**
 * Track an analytics event
 */
export function trackEvent(
  eventName: AnalyticsEvent,
  properties?: EventProperties
): void {
  // Skip if analytics is disabled
  if (process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'false') {
    console.log('📊 Analytics disabled, skipping event:', eventName);
    return;
  }

  // Skip if on server
  if (typeof window === 'undefined') {
    return;
  }

  // If Umami is ready, track immediately
  if (umamiReady && window.umami) {
    trackEventInternal(eventName, properties);
    return;
  }

  // Otherwise, queue the event
  eventQueue.push({ eventName, properties });
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Queuing event (Umami not ready):', eventName, properties);
  }
}

/**
 * Track a page view (usually automatic, but can be used for SPAs)
 */
export function trackPageView(url?: string): void {
  if (typeof window === 'undefined' || !window.umami) return;

  try {
    const pageUrl = url || window.location.pathname + window.location.search;
    window.umami.track('pageview', { url: pageUrl });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

/**
 * Check if Umami is loaded and ready
 */
export function isAnalyticsReady(): boolean {
  return typeof window !== 'undefined' && umamiReady && !!window.umami;
}


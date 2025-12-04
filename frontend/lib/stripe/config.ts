/**
 * Stripe configuration for DogYenta
 * Handles both client-side and server-side Stripe operations
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import StripeServer from 'stripe';
import { appConfig } from '../config';

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = appConfig.stripePublishableKey;
    
    if (!publishableKey) {
      throw new Error('Stripe publishable key is not set');
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};

// Server-side Stripe instance
export const getStripeServer = () => {
  const secretKey = appConfig.stripeSecretKey;
  
  if (!secretKey) {
    throw new Error('Stripe secret key is not set');
  }
  
  return new StripeServer(secretKey, {
    apiVersion: '2025-09-30.clover', // Use latest API version
  });
};

// Plan configuration
export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      'Basic dog search',
      'Up to 10 results per search',
      'AI-powered matching'
    ],
    limits: {
      searchesPerDay: 10,
      savedPreferences: true,
      emailAlerts: false,
      prioritySupport: false
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    priceId: appConfig.stripeProPriceId || 'price_pro_monthly',
    features: [
      'Always-on monitoring',
      'Saved preferences',
      'Email alerts'
    ],
    limits: {
      searchesPerDay: -1, // Unlimited
      savedPreferences: true,
      emailAlerts: true,
      prioritySupport: true
    }
  }
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = typeof PLANS[PlanId];

/**
 * Stripe configuration for DogYenta
 * Handles both client-side and server-side Stripe operations
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import StripeServer from 'stripe';

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};

// Server-side Stripe instance
export const getStripeServer = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
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
      'Basic preferences saving',
      'Community support'
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
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    features: [
      'Unlimited dog searches',
      'Advanced filtering options',
      'Email alerts for new matches',
      'Priority customer support',
      'Save unlimited favorites',
      'Export search results'
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

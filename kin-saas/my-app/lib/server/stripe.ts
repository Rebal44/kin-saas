import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;
let stripeKeyCached: string | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');

  if (!stripeInstance || stripeKeyCached !== key) {
    stripeInstance = new Stripe(key, { apiVersion: '2024-06-20' });
    stripeKeyCached = key;
  }

  return stripeInstance;
}

export function getStripePriceId(): string {
  const value = process.env.STRIPE_PRICE_ID;
  if (!value) throw new Error('Missing STRIPE_PRICE_ID');
  return value;
}

export function getStripeWebhookSecret(): string {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  return value;
}

export function getStripeTopupPriceId(): string {
  return process.env.STRIPE_TOPUP_PRICE_ID || '';
}

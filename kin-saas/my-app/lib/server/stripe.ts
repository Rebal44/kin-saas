import Stripe from 'stripe';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

export const STRIPE_PRICE_ID = requireEnv('STRIPE_PRICE_ID');
export const STRIPE_WEBHOOK_SECRET = requireEnv('STRIPE_WEBHOOK_SECRET');
export const STRIPE_TOPUP_PRICE_ID = process.env.STRIPE_TOPUP_PRICE_ID || '';


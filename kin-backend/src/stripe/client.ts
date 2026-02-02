import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export default stripe;

// Price configuration for $29/month subscription
export const SUBSCRIPTION_CONFIG = {
  amount: 2900, // $29.00 in cents
  currency: 'usd',
  interval: 'month' as const,
  productName: 'Kin Pro',
  description: 'Unlimited AI conversations via WhatsApp & Telegram',
  features: [
    'Unlimited AI conversations',
    'WhatsApp integration',
    'Telegram integration',
    'Priority response time',
    'File & image support',
    'Cancel anytime'
  ]
};

// Create a Stripe Customer
export async function createStripeCustomer(email: string, name?: string) {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      source: 'kin-saas'
    }
  });
}

// Create a Checkout Session
export async function createCheckoutSession(
  customerId: string,
  successUrl: string,
  cancelUrl: string
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 7, // 7-day free trial
      metadata: {
        source: 'kin-saas-checkout'
      }
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
      name: 'auto'
    }
  });
}

// Create Customer Portal Session
export async function createPortalSession(
  customerId: string,
  returnUrl: string
) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    configuration: process.env.STRIPE_PORTAL_CONFIG_ID,
    flow_data: {
      type: 'payment_method_update'
    }
  });
}

// Cancel subscription at period end
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Reactivate subscription
export async function reactivateSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'latest_invoice']
  });
}

// Construct webhook event
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    STRIPE_WEBHOOK_SECRET
  );
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): boolean {
  try {
    constructWebhookEvent(payload, signature);
    return true;
  } catch (err) {
    return false;
  }
}

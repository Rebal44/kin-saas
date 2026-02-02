/**
 * Mock Stripe Events for Testing
 */

export const mockStripeCustomer = {
  id: 'cus_test1234567890',
  email: 'test@example.com',
  name: 'Test User',
  phone: '+1234567890',
  metadata: {
    userId: 'user_test123',
  },
};

export const mockStripeSubscription = {
  id: 'sub_test1234567890',
  customer: 'cus_test1234567890',
  status: 'active',
  current_period_start: 1704067200,
  current_period_end: 1706745600,
  plan: {
    id: 'price_test123',
    nickname: 'Kin Pro Monthly',
    amount: 2900,
    currency: 'usd',
    interval: 'month',
  },
  metadata: {
    userId: 'user_test123',
  },
};

export const mockCheckoutSession = {
  id: 'cs_test1234567890',
  object: 'checkout.session',
  customer: 'cus_test1234567890',
  subscription: 'sub_test1234567890',
  payment_status: 'paid',
  status: 'complete',
  mode: 'subscription',
  amount_total: 2900,
  currency: 'usd',
  metadata: {
    userId: 'user_test123',
  },
  success_url: 'https://kin.app/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://kin.app/pricing',
  created: 1704067200,
  expires_at: 1704153600,
};

export const mockInvoice = {
  id: 'in_test1234567890',
  object: 'invoice',
  customer: 'cus_test1234567890',
  subscription: 'sub_test1234567890',
  status: 'paid',
  amount_paid: 2900,
  currency: 'usd',
  created: 1704067200,
  period_start: 1704067200,
  period_end: 1706745600,
  lines: {
    data: [
      {
        id: 'il_test123',
        amount: 2900,
        description: 'Kin Pro Monthly',
        period: {
          start: 1704067200,
          end: 1706745600,
        },
        plan: {
          id: 'price_test123',
          nickname: 'Kin Pro Monthly',
        },
      },
    ],
  },
};

// Stripe Webhook Events
export const createCheckoutCompletedEvent = (overrides = {}) => ({
  id: 'evt_test_checkout_completed',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  type: 'checkout.session.completed',
  data: {
    object: {
      ...mockCheckoutSession,
      ...overrides,
    },
  },
});

export const createSubscriptionCreatedEvent = (overrides = {}) => ({
  id: 'evt_test_subscription_created',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  type: 'customer.subscription.created',
  data: {
    object: {
      ...mockStripeSubscription,
      status: 'active',
      ...overrides,
    },
  },
});

export const createSubscriptionUpdatedEvent = (overrides = {}) => ({
  id: 'evt_test_subscription_updated',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  type: 'customer.subscription.updated',
  data: {
    object: {
      ...mockStripeSubscription,
      status: 'past_due',
      ...overrides,
    },
  },
});

export const createSubscriptionDeletedEvent = (overrides = {}) => ({
  id: 'evt_test_subscription_deleted',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  type: 'customer.subscription.deleted',
  data: {
    object: {
      ...mockStripeSubscription,
      status: 'canceled',
      canceled_at: 1704153600,
      ...overrides,
    },
  },
});

export const createInvoicePaidEvent = (overrides = {}) => ({
  id: 'evt_test_invoice_paid',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  type: 'invoice.paid',
  data: {
    object: {
      ...mockInvoice,
      ...overrides,
    },
  },
});

export const createInvoicePaymentFailedEvent = (overrides = {}) => ({
  id: 'evt_test_invoice_failed',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  type: 'invoice.payment_failed',
  data: {
    object: {
      ...mockInvoice,
      status: 'open',
      amount_paid: 0,
      attempted: true,
      next_payment_attempt: 1704153600,
      ...overrides,
    },
  },
});

export const createPaymentIntentSucceededEvent = (overrides = {}) => ({
  id: 'evt_test_payment_intent_succeeded',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_test1234567890',
      object: 'payment_intent',
      amount: 2900,
      currency: 'usd',
      customer: 'cus_test1234567890',
      status: 'succeeded',
      metadata: {
        userId: 'user_test123',
      },
      ...overrides,
    },
  },
});

export const createPaymentIntentFailedEvent = (overrides = {}) => ({
  id: 'evt_test_payment_intent_failed',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  type: 'payment_intent.payment_failed',
  data: {
    object: {
      id: 'pi_test1234567890',
      object: 'payment_intent',
      amount: 2900,
      currency: 'usd',
      customer: 'cus_test1234567890',
      status: 'requires_payment_method',
      last_payment_error: {
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'Your card was declined.',
      },
      ...overrides,
    },
  },
});

// Helper to construct Stripe signature header
export function constructStripeSignature(payload: string, secret: string): string {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// All event types for testing
export const allStripeEvents = {
  checkoutCompleted: createCheckoutCompletedEvent(),
  subscriptionCreated: createSubscriptionCreatedEvent(),
  subscriptionUpdated: createSubscriptionUpdatedEvent(),
  subscriptionDeleted: createSubscriptionDeletedEvent(),
  invoicePaid: createInvoicePaidEvent(),
  invoiceFailed: createInvoicePaymentFailedEvent(),
  paymentIntentSucceeded: createPaymentIntentSucceededEvent(),
  paymentIntentFailed: createPaymentIntentFailedEvent(),
};

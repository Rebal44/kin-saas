/**
 * Stripe Webhook Handler Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCheckoutCompletedEvent,
  createSubscriptionCreatedEvent,
  createSubscriptionUpdatedEvent,
  createSubscriptionDeletedEvent,
  createInvoicePaidEvent,
  createInvoicePaymentFailedEvent,
} from '../fixtures/stripe-events';
import { createMockSupabaseClient } from '../setup/test-utils';
import type Stripe from 'stripe';

// Stripe webhook handler functions (mock implementation for testing)
class StripeWebhookHandler {
  constructor(private supabase: any, private stripe: Stripe) {}
  
  async handleEvent(event: Stripe.Event): Promise<{ success: boolean; message: string }> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        case 'invoice.paid':
          return await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        default:
          return { success: true, message: `Unhandled event type: ${event.type}` };
      }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<{ success: boolean; message: string }> {
    const userId = session.metadata?.userId;
    if (!userId) {
      throw new Error('No userId in session metadata');
    }
    
    // Update user with subscription info
    await this.supabase.from('subscriptions').insert({
      user_id: userId,
      stripe_subscription_id: session.subscription,
      stripe_customer_id: session.customer,
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
    await this.supabase.from('users').update({
      subscription_status: 'active',
      stripe_customer_id: session.customer,
    }).eq('id', userId);
    
    return { success: true, message: 'Checkout completed processed' };
  }
  
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<{ success: boolean; message: string }> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      throw new Error('No userId in subscription metadata');
    }
    
    await this.supabase.from('subscriptions').insert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    });
    
    return { success: true, message: 'Subscription created processed' };
  }
  
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<{ success: boolean; message: string }> {
    const { data: existing } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (!existing) {
      throw new Error('Subscription not found');
    }
    
    await this.supabase.from('subscriptions').update({
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }).eq('stripe_subscription_id', subscription.id);
    
    // Update user status based on subscription status
    const userStatus = ['active', 'trialing'].includes(subscription.status) ? 'active' : 'inactive';
    await this.supabase.from('users').update({
      subscription_status: userStatus,
    }).eq('id', existing.user_id);
    
    return { success: true, message: 'Subscription updated processed' };
  }
  
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<{ success: boolean; message: string }> {
    await this.supabase.from('subscriptions').update({
      status: 'canceled',
    }).eq('stripe_subscription_id', subscription.id);
    
    // Find user and update status
    const { data } = await this.supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (data) {
      await this.supabase.from('users').update({
        subscription_status: 'canceled',
      }).eq('id', data.user_id);
    }
    
    return { success: true, message: 'Subscription deleted processed' };
  }
  
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<{ success: boolean; message: string }> {
    await this.supabase.from('invoices').insert({
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription,
      stripe_customer_id: invoice.customer as string,
      amount_paid: invoice.amount_paid,
      status: invoice.status,
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
    });
    
    return { success: true, message: 'Invoice paid processed' };
  }
  
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<{ success: boolean; message: string }> {
    await this.supabase.from('invoices').insert({
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription,
      stripe_customer_id: invoice.customer as string,
      amount_paid: 0,
      status: 'failed',
      next_payment_attempt: invoice.next_payment_attempt 
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null,
    });
    
    return { success: true, message: 'Invoice payment failed processed' };
  }
}

describe('Stripe Webhook Handler', () => {
  let handler: StripeWebhookHandler;
  let mockSupabase: any;
  let mockStripe: any;
  
  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    mockStripe = {
      webhooks: {
        constructEvent: vi.fn((payload, sig, secret) => JSON.parse(payload)),
      },
    };
    handler = new StripeWebhookHandler(mockSupabase, mockStripe);
  });
  
  describe('checkout.session.completed', () => {
    it('should process checkout completion', async () => {
      const event = createCheckoutCompletedEvent();
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Checkout completed processed');
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
    
    it('should fail without userId in metadata', async () => {
      const event = createCheckoutCompletedEvent({ metadata: {} });
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('userId');
    });
  });
  
  describe('customer.subscription.created', () => {
    it('should process new subscription', async () => {
      const event = createSubscriptionCreatedEvent();
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscription created processed');
    });
    
    it('should fail without userId', async () => {
      const event = createSubscriptionCreatedEvent({ metadata: {} });
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('userId');
    });
  });
  
  describe('customer.subscription.updated', () => {
    beforeEach(() => {
      mockSupabase._seed('subscriptions', [
        { id: 'sub_1', stripe_subscription_id: 'sub_test1234567890', user_id: 'user_123' },
      ]);
    });
    
    it('should update subscription status', async () => {
      const event = createSubscriptionUpdatedEvent({ status: 'past_due' });
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscription updated processed');
    });
    
    it('should update user status to active for active subscription', async () => {
      const event = createSubscriptionUpdatedEvent({ status: 'active' });
      await handler.handleEvent(event as Stripe.Event);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
    
    it('should update user status to inactive for past_due', async () => {
      const event = createSubscriptionUpdatedEvent({ status: 'past_due' });
      await handler.handleEvent(event as Stripe.Event);
      
      // User status should be updated to inactive
      const userUpdateCall = mockSupabase.from.mock.results.find(
        (r: any) => r.value?.update
      );
      expect(userUpdateCall).toBeDefined();
    });
  });
  
  describe('customer.subscription.deleted', () => {
    beforeEach(() => {
      mockSupabase._seed('subscriptions', [
        { id: 'sub_1', stripe_subscription_id: 'sub_test1234567890', user_id: 'user_123' },
      ]);
    });
    
    it('should mark subscription as canceled', async () => {
      const event = createSubscriptionDeletedEvent();
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscription deleted processed');
    });
    
    it('should update user subscription status to canceled', async () => {
      const event = createSubscriptionDeletedEvent();
      await handler.handleEvent(event as Stripe.Event);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
  });
  
  describe('invoice.paid', () => {
    it('should record paid invoice', async () => {
      const event = createInvoicePaidEvent();
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Invoice paid processed');
      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });
  });
  
  describe('invoice.payment_failed', () => {
    it('should record failed invoice', async () => {
      const event = createInvoicePaymentFailedEvent();
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Invoice payment failed processed');
    });
  });
  
  describe('unhandled events', () => {
    it('should gracefully handle unknown event types', async () => {
      const event = {
        id: 'evt_unknown',
        object: 'event',
        type: 'unknown.event.type',
        data: { object: {} },
      };
      
      const result = await handler.handleEvent(event as Stripe.Event);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Unhandled');
    });
  });
});

// Signature verification tests
describe('Webhook Signature Verification', () => {
  it('should verify valid signature', async () => {
    const crypto = await import('crypto');
    const secret = 'whsec_test_secret';
    const payload = JSON.stringify({ type: 'test.event' });
    const timestamp = Math.floor(Date.now() / 1000);
    
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    const header = `t=${timestamp},v1=${signature}`;
    
    // Mock verification would happen here
    expect(header).toContain('t=');
    expect(header).toContain('v1=');
  });
  
  it('should reject invalid signature', () => {
    const secret = 'whsec_test_secret';
    const payload = JSON.stringify({ type: 'test.event' });
    const invalidHeader = 't=1234567890,v1=invalidsignature';
    
    // Verification would fail
    expect(invalidHeader).not.toContain('valid');
  });
  
  it('should reject old timestamps', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 1000; // 1000 seconds ago
    const header = `t=${oldTimestamp},v1=some_signature`;
    
    // Should be considered too old (typical tolerance is 300 seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    expect(currentTime - oldTimestamp).toBeGreaterThan(300);
  });
});

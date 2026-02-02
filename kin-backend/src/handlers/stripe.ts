/**
 * Stripe Webhook Handler
 */

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

/**
 * Handle Stripe webhooks
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event: Stripe.Event;
  
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  
  if (!userId) {
    throw new Error('No userId in session metadata');
  }
  
  // Create subscription record
  await supabase.from('subscriptions').insert({
    user_id: userId,
    stripe_subscription_id: session.subscription as string,
    stripe_customer_id: session.customer as string,
    status: 'active',
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  // Update user
  await supabase.from('users').update({
    subscription_status: 'active',
    stripe_customer_id: session.customer as string,
  }).eq('id', userId);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    throw new Error('No userId in subscription metadata');
  }
  
  await supabase.from('subscriptions').insert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();
  
  if (!existing) {
    throw new Error('Subscription not found');
  }
  
  // Update subscription
  await supabase.from('subscriptions').update({
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  }).eq('stripe_subscription_id', subscription.id);
  
  // Update user status
  const userStatus = ['active', 'trialing'].includes(subscription.status) ? 'active' : 'inactive';
  await supabase.from('users').update({
    subscription_status: userStatus,
  }).eq('id', existing.user_id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  await supabase.from('subscriptions').update({
    status: 'canceled',
  }).eq('stripe_subscription_id', subscription.id);
  
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();
  
  if (data) {
    await supabase.from('users').update({
      subscription_status: 'canceled',
    }).eq('id', data.user_id);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  await supabase.from('invoices').insert({
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: invoice.subscription as string,
    stripe_customer_id: invoice.customer as string,
    amount_paid: invoice.amount_paid,
    status: invoice.status,
    period_start: new Date(invoice.period_start * 1000).toISOString(),
    period_end: new Date(invoice.period_end * 1000).toISOString(),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  await supabase.from('invoices').insert({
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: invoice.subscription as string,
    stripe_customer_id: invoice.customer as string,
    amount_paid: 0,
    status: 'failed',
    next_payment_attempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
      : null,
  });
}

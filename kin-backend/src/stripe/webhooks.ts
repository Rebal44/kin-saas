import { Request, Response } from 'express';
import stripe, { constructWebhookEvent } from './client';
import { supabase } from '../db/client';
import { applyCreditTransaction, getMonthlyCredits } from '../services/credits';

// Stripe webhook handler
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;

  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Log the webhook event
  await supabase.from('webhook_events').insert({
    source: 'stripe',
    event_type: event.type,
    payload: {
      id: event.id,
      type: event.type,
      created: event.created,
      data: event.data,
    } as any,
    processed: false
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    await supabase.from('webhook_events')
      .update({ processed: true })
      .eq('payload->>id', event.id);

    res.json({ received: true });
  } catch (err: any) {
    console.error('Error processing webhook:', err);
    
    // Log error
    await supabase.from('webhook_events')
      .update({ 
        processed: false,
        error_message: err.message 
      })
      .eq('payload->>id', event.id);

    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handle checkout.session.completed
async function handleCheckoutSessionCompleted(session: any) {
  if (session.mode === 'payment') {
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits || process.env.TOPUP_CREDITS || 0);
    if (userId && credits > 0) {
      await applyCreditTransaction({
        userId,
        delta: credits,
        reason: 'top_up',
        reference: `stripe:topup:${session.id}`,
        metadata: { sessionId: session.id },
      });
    }
    return;
  }

  if (session.mode !== 'subscription') return;

  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Get or create user by stripe_customer_id
  const { data: userByCustomer } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  const email = session.customer_details?.email || userByCustomer?.email;

  if (!email) {
    console.error('No email available for checkout session customer:', customerId);
    return;
  }

  const { data: user, error: userUpsertError } = await supabase
    .from('users')
    .upsert(
      {
        email,
        stripe_customer_id: customerId,
        subscription_status: 'inactive',
      } as any,
      { onConflict: 'email' }
    )
    .select('id')
    .single();

  if (userUpsertError || !user) {
    console.error('Failed to upsert user for customer:', customerId, userUpsertError);
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Insert or update subscription
  await supabase.from('subscriptions').upsert({
    user_id: user.id,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: subscription.items.data[0].price.id,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, {
    onConflict: 'stripe_subscription_id'
  });

  // Update user subscription status
  await supabase
    .from('users')
    .update({ 
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000) 
        : null
    })
    .eq('id', user.id);

  // Grant initial monthly credits at the start of the subscription/trial
  if (['active', 'trialing'].includes(subscription.status)) {
    await applyCreditTransaction({
      userId: user.id,
      delta: getMonthlyCredits(),
      reason: 'monthly_allowance',
      reference: `stripe:subscription_start:${subscription.id}:${subscription.current_period_start}`,
      metadata: { subscriptionId: subscription.id, periodStart: subscription.current_period_start },
    });
  }
}

// Handle invoice.paid
async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  await supabase
    .from('subscriptions')
    .update({ 
      status: 'active',
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Refill credits on renewal invoices (avoid double-grant on initial checkout)
  if (invoice.billing_reason !== 'subscription_cycle') {
    return;
  }

  // Grant credits once per renewal invoice (prevents double-grant via retries)
  const customerId = invoice.customer;
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (user?.id) {
    await applyCreditTransaction({
      userId: user.id,
      delta: getMonthlyCredits(),
      reason: 'monthly_allowance',
      reference: `stripe:invoice_paid:${invoice.id}`,
      metadata: { invoiceId: invoice.id, subscriptionId },
    });
  }
}

// Handle invoice.payment_failed
async function handleInvoicePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;

  if (!subscriptionId) return;

  await supabase
    .from('subscriptions')
    .update({ 
      status: 'past_due',
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Get user email to send notification
  const { data: user } = await supabase
    .from('users')
    .select('email, id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({ subscription_status: 'past_due' })
      .eq('id', user.id);
    
    // TODO: Send payment failure notification email
    console.log('Payment failed for user:', user.email);
  }
}

// Handle customer.subscription.created
async function handleSubscriptionCreated(subscription: any) {
  const customerId = subscription.customer;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  await supabase.from('subscriptions').upsert({
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0].price.id,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, {
    onConflict: 'stripe_subscription_id'
  });
}

// Handle customer.subscription.updated
async function handleSubscriptionUpdated(subscription: any) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!existing) {
    await handleSubscriptionCreated(subscription);
    return;
  }

  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000) 
        : null,
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id);

  // Update user status
  await supabase
    .from('users')
    .update({ subscription_status: subscription.status })
    .eq('id', existing.user_id);
}

// Handle customer.subscription.deleted
async function handleSubscriptionDeleted(subscription: any) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!existing) return;

  await supabase
    .from('subscriptions')
    .update({ 
      status: 'canceled',
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id);

  await supabase
    .from('users')
    .update({ 
      subscription_status: 'canceled'
    })
    .eq('id', existing.user_id);
}

// Handle trial_will_end
async function handleTrialWillEnd(subscription: any) {
  const { data: user } = await supabase
    .from('users')
    .select('email, id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (user) {
    // TODO: Send trial ending notification
    console.log('Trial ending soon for:', user.email);
  }
}

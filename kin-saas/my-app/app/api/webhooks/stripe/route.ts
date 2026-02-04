import type Stripe from 'stripe';
import { getStripe, getStripeWebhookSecret } from '@/lib/server/stripe';
import { getSupabase } from '@/lib/server/supabase';
import { applyCreditTransaction, getMonthlyCredits } from '@/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('ok', { status: 200 });
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    const webhookSecret = getStripeWebhookSecret();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabase();
  await supabase.from('webhook_events').insert({
    source: 'stripe',
    event_type: event.type,
    payload: {
      id: event.id,
      type: event.type,
      created: event.created,
      data: event.data,
    } as any,
    processed: false,
  } as any);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as any);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as any);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as any);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as any);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as any);
        break;
      default:
        break;
    }

    await supabase
      .from('webhook_events')
      .update({ processed: true } as any)
      .eq('payload->>id', event.id);

    return Response.json({ received: true }, { status: 200 });
  } catch (err: any) {
    await supabase
      .from('webhook_events')
      .update({ processed: false, error_message: err?.message || 'Webhook processing failed' } as any)
      .eq('payload->>id', event.id);

    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const supabase = getSupabase();
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

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!customerId || !subscriptionId) return;

  const { data: userByCustomer } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  const email = session.customer_details?.email || userByCustomer?.email;

  if (!email) return;

  const { data: user } = await supabase
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

  if (!user) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await supabase.from('subscriptions').upsert(
    {
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0].price.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
    } as any,
    { onConflict: 'stripe_subscription_id' }
  );

  await supabase
    .from('users')
    .update({
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    } as any)
    .eq('id', user.id);

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

async function handleInvoicePaid(invoice: any) {
  const supabase = getSupabase();
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'active', updated_at: new Date() } as any)
    .eq('stripe_subscription_id', subscriptionId);

  if (invoice.billing_reason !== 'subscription_cycle') {
    return;
  }

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

async function handleInvoicePaymentFailed(invoice: any) {
  const supabase = getSupabase();
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date() } as any)
    .eq('stripe_subscription_id', subscriptionId);

  const customerId = invoice.customer;
  await supabase
    .from('users')
    .update({ subscription_status: 'past_due' } as any)
    .eq('stripe_customer_id', customerId);
}

async function handleSubscriptionCreated(subscription: any) {
  const supabase = getSupabase();
  const customerId = subscription.customer;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!user?.id) return;

  await supabase.from('subscriptions').upsert(
    {
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0].price.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
    } as any,
    { onConflict: 'stripe_subscription_id' }
  );

  await supabase
    .from('users')
    .update({
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    } as any)
    .eq('id', user.id);
}

async function handleSubscriptionUpdated(subscription: any) {
  const supabase = getSupabase();
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date(),
    } as any)
    .eq('stripe_subscription_id', subscription.id);

  const customerId = subscription.customer;
  await supabase
    .from('users')
    .update({
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    } as any)
    .eq('stripe_customer_id', customerId);
}

async function handleSubscriptionDeleted(subscription: any) {
  const supabase = getSupabase();
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date(), updated_at: new Date() } as any)
    .eq('stripe_subscription_id', subscription.id);

  const customerId = subscription.customer;
  await supabase
    .from('users')
    .update({ subscription_status: 'canceled' } as any)
    .eq('stripe_customer_id', customerId);
}

async function handleTrialWillEnd(subscription: any) {
  const supabase = getSupabase();
  const customerId = subscription.customer;
  await supabase
    .from('users')
    .update({
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    } as any)
    .eq('stripe_customer_id', customerId);
}

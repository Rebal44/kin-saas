import { Router } from 'express';
import stripe, {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  createTopUpSession,
} from '../stripe/client';
import { supabase } from '../db/client';
import { telegramService } from '../services/telegram';
import { createBotConnection } from '../db';
import { applyCreditTransaction, getMonthlyCredits } from '../services/credits';

const router = Router();

function getFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  );
}

// Create checkout session (loginless)
// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const email: string | undefined = req.body?.email;
    const name: string | undefined = req.body?.name;

    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, stripe_customer_id, subscription_status')
      .eq('email', email)
      .maybeSingle();

    if (existingUser?.subscription_status === 'active') {
      res.status(400).json({ error: 'Already subscribed' });
      return;
    }

    let customerId = existingUser?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        ...(name ? { name } : {}),
        metadata: { source: 'kin-saas-web' },
      });
      customerId = customer.id;
    }

    // Upsert user record so webhooks can attach to it
    const { data: user, error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          id: existingUser?.id,
          email,
          stripe_customer_id: customerId,
          subscription_status: existingUser?.subscription_status || 'inactive',
        } as any,
        { onConflict: 'email' }
      )
      .select('id')
      .single();

    if (upsertError || !user) {
      res.status(500).json({ error: 'Failed to create user record' });
      return;
    }

    // Ensure credit balance row exists
    await supabase
      .from('credit_balances')
      .upsert({ user_id: user.id, balance: 0 } as any, { onConflict: 'user_id' });

    const frontendUrl = getFrontendUrl();
    const session = await createCheckoutSession(
      customerId,
      `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      `${frontendUrl}/cancel`
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

// Create top-up checkout session (one-time)
// POST /api/stripe/create-topup-session
router.post('/create-topup-session', async (req, res) => {
  try {
    const email: string | undefined = req.body?.email;
    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, stripe_customer_id, subscription_status')
      .eq('email', email)
      .maybeSingle();

    if (!user?.stripe_customer_id) {
      res.status(400).json({ error: 'User not found or not subscribed' });
      return;
    }

    const topUpCredits = Number(process.env.TOPUP_CREDITS || 5000);
    const frontendUrl = getFrontendUrl();
    const session = await createTopUpSession(
      user.stripe_customer_id,
      `${frontendUrl}/top-up/success?session_id={CHECKOUT_SESSION_ID}`,
      `${frontendUrl}/top-up`,
      {
        userId: user.id,
        credits: String(topUpCredits),
      }
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating top-up session:', error);
    res.status(500).json({ error: error.message || 'Failed to create top-up session' });
  }
});

// Resolve a checkout session to a Telegram connect link
// GET /api/stripe/checkout-session?sessionId=cs_...
router.get('/checkout-session', async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const email =
      session.customer_details?.email ||
      (typeof session.customer === 'string' ? undefined : session.customer?.email || undefined);

    if (!customerId || !email) {
      res.status(400).json({ error: 'Could not resolve customer/email from checkout session' });
      return;
    }

    // Ensure user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert(
        {
          email,
          stripe_customer_id: customerId,
          subscription_status: 'inactive',
        } as any,
        { onConflict: 'email' }
      )
      .select('id, subscription_status')
      .single();

    if (userError || !user) {
      res.status(500).json({ error: 'Failed to load user' });
      return;
    }

    // If Stripe already created the subscription, sync it immediately (best-effort)
    if (session.subscription && typeof session.subscription !== 'string') {
      const subscription = session.subscription;
      await supabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0]?.price?.id,
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

      // Grant initial monthly credits immediately (idempotent, same reference as webhook)
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

    // Create a fresh pending Telegram connection token
    const connection = await createBotConnection({
      user_id: user.id,
      platform: 'telegram',
      is_connected: false,
    } as any);

    if (!connection) {
      res.status(500).json({ error: 'Failed to create Telegram connection token' });
      return;
    }

    const botInfo = await telegramService.getMe();
    if (!botInfo || !botInfo.username) {
      res.status(500).json({ error: 'Telegram bot is not configured' });
      return;
    }

    const deepLink = `https://t.me/${botInfo.username}?start=${connection.id}`;

    res.json({
      email,
      customerId,
      connectionId: connection.id,
      botUsername: botInfo.username,
      deepLink,
    });
  } catch (error: any) {
    console.error('Error resolving checkout session:', error);
    res.status(500).json({ error: error.message || 'Failed to resolve checkout session' });
  }
});

// Create customer portal session
// POST /api/stripe/create-portal-session { sessionId: "cs_..." }
router.post('/create-portal-session', async (req, res) => {
  try {
    const sessionId: string | undefined = req.body?.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    const checkout = await stripe.checkout.sessions.retrieve(sessionId);
    const customerId = checkout.customer as string | null;
    if (!customerId) {
      res.status(400).json({ error: 'Checkout session has no customer' });
      return;
    }

    const portal = await createPortalSession(customerId, `${getFrontendUrl()}/`);
    res.json({ url: portal.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
});

// Get subscription details from Stripe (by subscription id)
// GET /api/stripe/subscription?subscriptionId=sub_...
router.get('/subscription', async (req, res) => {
  try {
    const subscriptionId = req.query.subscriptionId;
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      res.status(400).json({ error: 'subscriptionId is required' });
      return;
    }

    const stripeSubscription = await getSubscription(subscriptionId);

    res.json({
      status: stripeSubscription.status,
      currentPeriodEnd: stripeSubscription.current_period_end,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    });
  } catch (error: any) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to get subscription' });
  }
});

// Cancel subscription at period end
// POST /api/stripe/cancel { subscriptionId: "sub_..." }
router.post('/cancel', async (req, res) => {
  try {
    const subscriptionId: string | undefined = req.body?.subscriptionId;
    if (!subscriptionId) {
      res.status(400).json({ error: 'subscriptionId is required' });
      return;
    }

    await cancelSubscription(subscriptionId);
    res.json({ message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
// POST /api/stripe/reactivate { subscriptionId: "sub_..." }
router.post('/reactivate', async (req, res) => {
  try {
    const subscriptionId: string | undefined = req.body?.subscriptionId;
    if (!subscriptionId) {
      res.status(400).json({ error: 'subscriptionId is required' });
      return;
    }

    await reactivateSubscription(subscriptionId);
    res.json({ message: 'Subscription reactivated' });
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to reactivate subscription' });
  }
});

export default router;

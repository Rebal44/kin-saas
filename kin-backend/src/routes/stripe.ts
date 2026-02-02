import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import stripe, { 
  createCheckoutSession, 
  createPortalSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription
} from './client';
import { supabase } from '../db/client';

const router = Router();

// Create checkout session
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id, email, subscription_status')
      .eq('clerk_id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.subscription_status === 'active') {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    let customerId = user.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { clerk_id: userId }
      });
      customerId = customer.id;

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('clerk_id', userId);
    }

    const session = await createCheckoutSession(
      customerId,
      `${process.env.FRONTEND_URL}/dashboard?checkout=success`,
      `${process.env.FRONTEND_URL}/pricing?checkout=canceled`
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create customer portal session
router.post('/create-portal-session', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('clerk_id', userId)
      .single();

    if (error || !user || !user.stripe_customer_id) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const session = await createPortalSession(
      user.stripe_customer_id,
      `${process.env.FRONTEND_URL}/dashboard`
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription status
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', 
        supabase.from('users').select('id').eq('clerk_id', userId)
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !subscription) {
      return res.json({ status: 'inactive' });
    }

    // Get fresh data from Stripe
    const stripeSubscription = await getSubscription(subscription.stripe_subscription_id);

    res.json({
      status: stripeSubscription.status,
      currentPeriodEnd: stripeSubscription.current_period_end,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      priceId: subscription.stripe_price_id
    });
  } catch (error: any) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    await cancelSubscription(subscription.stripe_subscription_id);

    res.json({ message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reactivate subscription
router.post('/reactivate', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('cancel_at_period_end', true)
      .single();

    if (!subscription) {
      return res.status(400).json({ error: 'No cancellable subscription found' });
    }

    await reactivateSubscription(subscription.stripe_subscription_id);

    res.json({ message: 'Subscription reactivated' });
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

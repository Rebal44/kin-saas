import stripe from '../stripe/client';
import { supabase } from '../db/client';

const ALLOWED_STATUSES = new Set(['active', 'trialing']);

export async function syncSubscriptionStatusForUser(userId: string): Promise<'active' | 'trialing' | 'inactive' | string> {
  const { data: user } = await supabase
    .from('users')
    .select('id, stripe_customer_id, subscription_status')
    .eq('id', userId)
    .single();

  const customerId = (user as any)?.stripe_customer_id as string | null | undefined;
  if (!customerId) return (user as any)?.subscription_status || 'inactive';

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });

  const best = subscriptions.data.find((s) => ALLOWED_STATUSES.has(s.status));
  if (!best) return (user as any)?.subscription_status || 'inactive';

  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: best.id,
      stripe_price_id: best.items.data[0]?.price?.id,
      status: best.status,
      current_period_start: new Date(best.current_period_start * 1000),
      current_period_end: new Date(best.current_period_end * 1000),
      cancel_at_period_end: best.cancel_at_period_end,
      canceled_at: best.canceled_at ? new Date(best.canceled_at * 1000) : null,
    } as any,
    { onConflict: 'stripe_subscription_id' }
  );

  await supabase
    .from('users')
    .update({
      subscription_status: best.status,
      trial_ends_at: best.trial_end ? new Date(best.trial_end * 1000) : null,
    } as any)
    .eq('id', userId);

  return best.status;
}


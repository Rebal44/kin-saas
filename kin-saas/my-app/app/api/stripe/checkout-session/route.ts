import { stripe } from '@/lib/server/stripe';
import { supabase } from '@/lib/server/supabase';
import { applyCreditTransaction, getMonthlyCredits } from '@/lib/server/credits';
import { telegramGetMe } from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return Response.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const email = session.customer_details?.email || undefined;

    if (!customerId || !email) {
      return Response.json(
        { error: 'Could not resolve customer/email from checkout session' },
        { status: 400 }
      );
    }

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
      .select('id')
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Failed to load user' }, { status: 500 });
    }

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

    const { data: connection, error: connectionError } = await supabase
      .from('bot_connections')
      .insert({
        user_id: user.id,
        platform: 'telegram',
        is_connected: false,
        is_active: true,
      } as any)
      .select('id')
      .single();

    if (connectionError || !connection) {
      return Response.json({ error: 'Failed to create Telegram connection token' }, { status: 500 });
    }

    const botInfo = await telegramGetMe();
    if (!botInfo?.username) {
      return Response.json({ error: 'Telegram bot is not configured' }, { status: 500 });
    }

    const deepLink = `https://t.me/${botInfo.username}?start=${connection.id}`;

    return Response.json({
      email,
      customerId,
      connectionId: connection.id,
      botUsername: botInfo.username,
      deepLink,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to resolve checkout session' }, { status: 500 });
  }
}

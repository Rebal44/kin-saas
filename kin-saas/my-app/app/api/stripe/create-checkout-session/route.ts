import { getStripe, getStripePriceId } from '@/lib/server/stripe';
import { getSupabase } from '@/lib/server/supabase';
import { getRequestOrigin } from '@/lib/server/origin';
import { ensureCreditBalanceRow } from '@/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const priceId = getStripePriceId();
    const supabase = getSupabase();

    const body = (await request.json()) as { email?: string; name?: string };
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();

    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, stripe_customer_id, subscription_status')
      .eq('email', email)
      .maybeSingle();

    if (existingUser?.subscription_status === 'active') {
      return Response.json({ error: 'Already subscribed' }, { status: 400 });
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
      return Response.json({ error: 'Failed to create user record' }, { status: 500 });
    }

    await ensureCreditBalanceRow(user.id);

    const origin = getRequestOrigin(request);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      subscription_data: {
        trial_period_days: 7,
        metadata: { source: 'kin-saas-checkout' },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: { address: 'auto', name: 'auto' },
    });

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to create checkout session' }, { status: 500 });
  }
}

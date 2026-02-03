import { getStripe, getStripeTopupPriceId } from '@/lib/server/stripe';
import { getSupabase } from '@/lib/server/supabase';
import { getRequestOrigin } from '@/lib/server/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const supabase = getSupabase();

    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .eq('email', email)
      .maybeSingle();

    if (!user?.stripe_customer_id) {
      return Response.json({ error: 'User not found or not subscribed' }, { status: 400 });
    }

    const priceId = getStripeTopupPriceId();
    if (!priceId) {
      return Response.json({ error: 'STRIPE_TOPUP_PRICE_ID is not configured' }, { status: 500 });
    }

    const topUpCredits = Number(process.env.TOPUP_CREDITS || 5000);
    const origin = getRequestOrigin(request);
    const session = await stripe.checkout.sessions.create({
      customer: user.stripe_customer_id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${origin}/top-up/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/top-up`,
      metadata: {
        userId: user.id,
        credits: String(topUpCredits),
      },
      allow_promotion_codes: false,
    });

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to create top up session' }, { status: 500 });
  }
}

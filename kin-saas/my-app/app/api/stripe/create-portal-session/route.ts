import { getStripe } from '@/lib/server/stripe';
import { getSupabase } from '@/lib/server/supabase';
import { assertDatabaseReady } from '@/lib/server/dbErrors';
import { getRequestOrigin } from '@/lib/server/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const supabase = getSupabase();

    const dbIssue = await assertDatabaseReady(supabase);
    if (dbIssue) {
      return Response.json({ error: dbIssue }, { status: 500 });
    }

    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle();

    if (!user?.stripe_customer_id) {
      return Response.json({ error: 'User not found or missing Stripe customer' }, { status: 400 });
    }

    const origin = getRequestOrigin(request);
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${origin}/account`,
    });

    return Response.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Failed to open billing portal' }, { status: 500 });
  }
}


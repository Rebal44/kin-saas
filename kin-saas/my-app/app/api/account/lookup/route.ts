import { getSupabase } from '@/lib/server/supabase';
import { assertDatabaseReady, formatDbError } from '@/lib/server/dbErrors';
import { getCreditBalance } from '@/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();

    const dbIssue = await assertDatabaseReady(supabase);
    if (dbIssue) {
      return Response.json({ error: dbIssue }, { status: 500 });
    }

    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, subscription_status, trial_ends_at, stripe_customer_id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return Response.json({ error: formatDbError(error) }, { status: 500 });
    }
    if (!user?.id) {
      return Response.json({ error: 'No account found for that email' }, { status: 404 });
    }

    const balance = await getCreditBalance(user.id);

    return Response.json(
      {
        ok: true,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        trialEndsAt: user.trial_ends_at,
        credits: balance,
        hasStripeCustomer: !!user.stripe_customer_id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Failed to load account' }, { status: 500 });
  }
}


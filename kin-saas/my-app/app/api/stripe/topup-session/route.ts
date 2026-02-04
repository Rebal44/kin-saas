import { getStripe } from '@/lib/server/stripe';
import { getSupabase } from '@/lib/server/supabase';
import { assertDatabaseReady } from '@/lib/server/dbErrors';
import { applyCreditTransaction, ensureCreditBalanceRow, getCreditBalance } from '@/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const stripe = getStripe();
    const supabase = getSupabase();

    const dbIssue = await assertDatabaseReady(supabase);
    if (dbIssue) {
      return Response.json({ error: dbIssue }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return Response.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== 'payment') {
      return Response.json({ error: 'Not a top up session' }, { status: 400 });
    }

    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits || process.env.TOPUP_CREDITS || 0);

    if (!userId) {
      return Response.json({ error: 'Missing userId metadata on session' }, { status: 400 });
    }
    if (!Number.isFinite(credits) || credits <= 0) {
      return Response.json({ error: 'Missing credits metadata on session' }, { status: 400 });
    }

    await ensureCreditBalanceRow(userId);

    await applyCreditTransaction({
      userId,
      delta: credits,
      reason: 'top_up',
      reference: `stripe:topup:${session.id}`,
      metadata: { sessionId: session.id },
    });

    const balance = await getCreditBalance(userId);

    return Response.json({ ok: true, userId, creditsAdded: credits, balance }, { status: 200 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to finalize top up' }, { status: 500 });
  }
}


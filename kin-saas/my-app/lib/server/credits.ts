import { getSupabase } from './supabase';
import { formatDbError } from './dbErrors';

const DEFAULT_MONTHLY_CREDITS = 10_000;

export function getMonthlyCredits(): number {
  const value = Number(process.env.MONTHLY_CREDITS || DEFAULT_MONTHLY_CREDITS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MONTHLY_CREDITS;
}

export async function ensureCreditBalanceRow(userId: string) {
  const supabase = getSupabase();
  // IMPORTANT: do NOT overwrite existing balances to 0.
  // We only want to create the row if it doesn't exist.
  const { error } = await supabase
    .from('credit_balances')
    .upsert(
      { user_id: userId, balance: 0 } as any,
      { onConflict: 'user_id', ignoreDuplicates: true } as any
    );
  if (error) {
    throw new Error(formatDbError(error));
  }
}

export async function getCreditBalance(userId: string): Promise<number> {
  const supabase = getSupabase();
  await ensureCreditBalanceRow(userId);
  const { data, error } = await supabase
    .from('credit_balances')
    .select('balance')
    .eq('user_id', userId)
    .single();
  if (error) {
    throw new Error(formatDbError(error));
  }

  const stored = Number((data as any)?.balance || 0);
  if (stored > 0) return stored;

  // If balance is 0 but there are ledger rows, reconcile (heals earlier buggy deployments
  // that accidentally overwrote `credit_balances.balance` to 0).
  const { data: anyTx, error: anyTxError } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (anyTxError) {
    throw new Error(formatDbError(anyTxError));
  }
  if (!anyTx) return stored;

  return await reconcileCreditBalance(userId);
}

export async function reconcileCreditBalance(userId: string): Promise<number> {
  const supabase = getSupabase();
  await ensureCreditBalanceRow(userId);

  const { data: rows, error } = await supabase
    .from('credit_transactions')
    .select('delta')
    .eq('user_id', userId);
  if (error) {
    throw new Error(formatDbError(error));
  }

  const sum = (rows || []).reduce((acc: number, row: any) => acc + Number(row?.delta || 0), 0);
  const next = Math.max(0, sum);

  const { error: updateError } = await supabase
    .from('credit_balances')
    .update({ balance: next } as any)
    .eq('user_id', userId);
  if (updateError) {
    throw new Error(formatDbError(updateError));
  }

  return next;
}

export async function applyCreditTransaction(params: {
  userId: string;
  delta: number;
  reason: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabase();
  const { userId, delta, reason, reference, metadata } = params;

  await ensureCreditBalanceRow(userId);

  if (reference) {
    const { data: existing, error } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('reference', reference)
      .maybeSingle();
    if (error) {
      throw new Error(formatDbError(error));
    }

    if (existing) {
      await reconcileCreditBalance(userId);
      return;
    }
  }

  const current = await getCreditBalance(userId);

  const { error: insertError } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    delta,
    reason,
    reference,
    metadata: metadata || {},
  } as any);
  if (insertError) {
    throw new Error(formatDbError(insertError));
  }

  const next = Math.max(0, current + delta);

  const { error: updateError } = await supabase
    .from('credit_balances')
    .update({ balance: next } as any)
    .eq('user_id', userId);
  if (updateError) {
    throw new Error(formatDbError(updateError));
  }
}

export async function debitCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; balance: number }> {
  const { userId, amount, reason, reference, metadata } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: true, balance: await getCreditBalance(userId) };
  }

  const balance = await getCreditBalance(userId);
  if (balance < amount) return { ok: false, balance };

  await applyCreditTransaction({
    userId,
    delta: -amount,
    reason,
    reference,
    metadata,
  });

  return { ok: true, balance: balance - amount };
}

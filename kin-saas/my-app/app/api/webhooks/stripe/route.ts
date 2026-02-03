import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('ok', { status: 200 });
}

function parseStripeSignature(signature: string) {
  const items = signature.split(',').map((part) => part.trim());
  const map: Record<string, string[]> = {};
  for (const item of items) {
    const [key, value] = item.split('=');
    if (!key || !value) continue;
    map[key] = map[key] || [];
    map[key].push(value);
  }
  return map;
}

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyStripeSignature(payload: string, signature: string, secret: string) {
  const parsed = parseStripeSignature(signature);
  const timestamp = parsed.t?.[0];
  const signatures = parsed.v1 || [];

  if (!timestamp || signatures.length === 0) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return signatures.some((sig) => timingSafeEqual(sig, expected));
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Missing STRIPE_WEBHOOK_SECRET' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const payload = await request.text();
  const verified = verifyStripeSignature(payload, signature, secret);

  if (!verified) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

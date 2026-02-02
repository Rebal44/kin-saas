import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as any;

  switch (event.type) {
    case "checkout.session.completed":
      // Handle successful subscription
      const userId = session.metadata?.userId;
      
      if (userId) {
        // Update user's subscription status in database
        console.log(`User ${userId} completed checkout`);
        // TODO: Update subscription in Supabase
      }
      break;

    case "invoice.payment_succeeded":
      // Handle successful payment
      console.log("Payment succeeded:", session.id);
      break;

    case "customer.subscription.deleted":
      // Handle subscription cancellation
      console.log("Subscription cancelled:", session.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

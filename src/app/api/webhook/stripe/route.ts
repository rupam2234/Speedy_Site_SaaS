import { NextResponse, after } from "next/server";
import Stripe from "stripe";
import { finalizePaidOrder, provisionEntitlement } from "@/lib/entitlement";
import { runAutoAssignmentIfEnabled } from "@/lib/services/assignmentService";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "build-placeholder"); // build-safe

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook not configured (missing STRIPE_WEBHOOK_SECRET)" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    // Raw body is REQUIRED for signature verification — never parse first
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Signature verification failed", details: err?.message },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Provision the ENTITLEMENT.
        const result = await provisionEntitlement({
          id: session.id,
          client_reference_id:
            session.client_reference_id ?? session.metadata?.user_id ?? null,
          amount_total: session.amount_total ?? null,
          currency: session.currency ?? null,
          customer: session.customer,
        });

        // Payment at the end of setup: bind the entitlement to the pending
        // order and flip that order to paid. finalizePaidOrder is a no-op for
        // standalone purchases (no order_id in the metadata).
        const { orderId } = await finalizePaidOrder(session);

        // The order only becomes real at payment, so the expert queue is only
        // fed now. runAutoAssignmentIfEnabled is itself idempotent (it skips
        // orders that already have an active assignment), so a late webhook
        // racing the reconcile endpoint cannot double-assign.
        if (orderId) {
          after(async () => {
            try {
              await runAutoAssignmentIfEnabled(orderId);
            } catch (bgError) {
              console.error(
                `Background auto-assignment failed for order ${orderId}:`,
                bgError,
              );
            }
          });
        }

        return NextResponse.json({ received: true, ...result });
      }
      default:
        // Acknowledge unhandled events so Stripe stops retrying them
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // 500 tells Stripe to retry the delivery
    return NextResponse.json(
      { error: "Webhook handler failed", details: err?.message },
      { status: 500 },
    );
  }
}

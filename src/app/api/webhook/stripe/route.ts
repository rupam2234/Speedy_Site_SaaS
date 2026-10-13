import { NextResponse } from "next/server";
import Stripe from "stripe";
import { setupDB } from "@/lib/db";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "build-placeholder"); // build-safe
const db = setupDB();

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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

        // Idempotency: Stripe retries deliveries — skip if already provisioned
        const { data: existing } = await db
          .from("user_services")
          .select("id")
          .eq("service_type", "managed_wp")
          .eq("metadata->>stripe_session_id", session.id)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ received: true, duplicate: true });
        }

        const userId = session.client_reference_id ?? session.metadata?.user_id;
        if (!userId) {
          return NextResponse.json(
            { error: "No user reference on session" },
            { status: 400 },
          );
        }

        const purchasedAt = new Date();
        const expiresAt = new Date(purchasedAt.getTime() + ONE_YEAR_MS);

        // Provision the ENTITLEMENT only — the order itself is created by
        // /api/orders/managed/add once the customer submits WP credentials
        // (the UI flow: Stripe success -> required-data page -> managed/add,
        // which looks up this row via metadata->>stripe_session_id)
        const { error: insertError } = await db.from("user_services").insert({
          user_id: userId,
          service_type: "managed_wp",
          status: "active",
          purchased_at: purchasedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          metadata: {
            plan_name: "Managed WP",
            site_limit: 1, // $299 per site per year (docs/GOALS.md)
            stripe_session_id: session.id,
            stripe_customer_id:
              typeof session.customer === "string"
                ? session.customer
                : (session.customer?.id ?? null),
            amount_total: session.amount_total ?? null,
            currency: session.currency ?? null,
          },
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        break;
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

import { setupDB } from "@/lib/db";
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const worker = setupDB();

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Signature valdiation failed: ", error.message);
    return new Response("invalid signature", { status: 400 });
  }

  // handle the webhooks
  try {
    switch (event.type) {
      // Get customer id when a session is completed
      // Occurs when a Checkout Session has been successfully completed
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        await worker
          .from("subscriptions")
          .update({
            stripe_subscription_status: "session completed",
            stripe_customer_id: session.customer as string,
          })
          .eq("stripe_session_id", session.id);

        break;
      }

      // Update subscription status based on success or failure
      // Occurs whenever a customer is signed up for a new plan.

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;

        await worker
          .from("subscriptions")
          .update({
            stripe_subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            period_starts_at: new Date(subscription.start_date).toISOString(),
            period_ends_at: new Date(subscription.cancel_at!).toISOString(),
            status: "active",
            plan:
              subscription.items.data[0].price.id ===
              "price_1SHfk8FudyIXBfXkozoK2jmm"
                ? "Basic"
                : subscription.items.data[0].price.id ===
                  "price_1SHfnpFudyIXBfXkLekhIkoM"
                ? "Pro"
                : subscription.items.data[0].price.id ===
                  "price_1SHfpXFudyIXBfXkVPU9bgrP"
                ? "Agency"
                : "Free",
          })
          .eq("stripe_customer_id", subscription.customer as string);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await worker
          .from("subscriptions")
          .update({
            status: "canceled",
            stripe_subscription_status: "canceled",
          })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        await worker
          .from("subscriptions")
          .update({
            status: "paused",
            stripe_subscription_status: "passed due",
          })
          .eq("stripe_customer_id", invoice.customer! as string);

        break;
      }
    }
  } catch (error: any) {
    console.error("Webhook DB error:", error);
    return new Response("Error", { status: 500 });
  }

  return new Response("subscription update successful", { status: 200 });
}

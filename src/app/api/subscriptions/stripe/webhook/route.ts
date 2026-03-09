import { sendRenewalSuccessEmail } from "@/app/api/emails/renewalSuccess";
import { SubscriptionCreated } from "@/app/api/emails/subscriptionCreated";
import { setupDB } from "@/lib/db";
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
}); // updated

const worker = setupDB();

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error: any) {
    console.error("Signature validation failed:", error.message);
    return new Response("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      /*** CHECKOUT SESSION COMPLETED ***/
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        await worker
          .from("subscriptions")
          .update({
            stripe_subscription_status: "session completed",
            stripe_customer_id: session.customer as string,
            stripe_session_id: session.id,
          })
          .eq("user_id", userId as string);

        break;
      }

      /*** SUBSCRIPTION CREATED ***/
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
      
        // Determine plan
        const priceId = subscription.items.data[0].price.id;
        const activeplan =
          priceId === "price_1SHfk8FudyIXBfXkozoK2jmm"
            ? "Basic"
            : priceId === "price_1SHfnpFudyIXBfXkLekhIkoM"
              ? "Pro"
              : priceId === "price_1SHfpXFudyIXBfXkVPU9bgrP"
                ? "Agency"
                : "Free";
      
        const billingCycleEnd = new Date(
          subscription.billing_cycle_anchor * 1000
        ).toISOString();
      
        // Fetch existing subscription to get user_id
        const { data: existing } = await worker
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", subscription.customer as string)
          .single();
      
        // Get safe UUID
        const userId =
          existing?.user_id ?? subscription.metadata?.user_id ?? null;
      
        if (!userId) {
          console.warn(
            "No valid UUID for user_id; skipping subscription upsert for customer:",
            subscription.customer
          );
          break; // Stop processing if we don't have a valid UUID
        }
      
        const { error } = await worker
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_subscription_status: subscription.status,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              period_starts_at: new Date(subscription.start_date * 1000).toISOString(),
              period_ends_at: subscription.billing_cycle_anchor
                ? billingCycleEnd
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: "active",
              plan: activeplan,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" }
          );
      
        console.log("SUBSCRIPTION CREATED UPDATE:", error ?? "success");
      
        // Send subscription created email
        await SubscriptionCreated({
          stripeCustomerId: subscription.customer as string,
          plan: activeplan,
          billingCycleEnd: billingCycleEnd,
        });
      
        break;
      }

      /*** CUSTOMER CANCELED SUBSCRIPTION ***/
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await worker
          .from("subscriptions")
          .update({
            status: "canceled",
            stripe_subscription_status: "canceled",
          })
          .eq("stripe_subscription_id", subscription.id);

        console.log("SUBSCRIPTION DELETED UPDATE:", error ?? "success");
        break;
      }

      /*** PAYMENT FAILED ***/
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const { error } = await worker
          .from("subscriptions")
          .update({
            status: "paused",
            stripe_subscription_status: "past due",
          })
          .eq("stripe_customer_id", invoice.customer as string);

        console.log("PAYMENT UPDATE FAILED:", error ?? "success");
        break;
      }

      /** AUTOMATIC RENEWALS */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // Only reset usage on real subscription renewals
        // this will only reset usage on monthly renewal, 
        // not upgrades (reseting on upgrade can allow people additional quota, revenue leakage)
        if (invoice.billing_reason !== "subscription_cycle") { 
          break;
        }

        if (!invoice.period_start || !invoice.period_end) {
          break;
        }

        const periodStart = new Date(invoice.period_start * 1000).toISOString();
        const periodEnd = new Date(invoice.period_end * 1000).toISOString();

        const { error } = await worker
          .from("subscriptions")
          .update({
            status: "active",
            stripe_subscription_status: "active",
            updated_at: new Date().toISOString(),
            current_usage: 0, // resets the usage
            period_starts_at: periodStart,
            period_ends_at: periodEnd,
          })
          .eq("stripe_customer_id", invoice.customer as string);

        if (error) {
          console.log("Subscription update failed: ", error);
        }

        // send email
        await sendRenewalSuccessEmail({
          stripeCustomerId: invoice.customer as string,
        });

        break;
      }

      /** CUSTOMER UPDATE */
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Determine period start
        const periodStart = new Date(subscription.start_date * 1000);

        // Determine period end
        let periodEnd: Date;

        // Grab the first price item
        const price = subscription.items.data[0].price;
        const recurring = price.recurring;

        if (recurring) {
          // Use subscription.billing_cycle_anchor if available
          if (subscription.billing_cycle_anchor) {
            periodEnd = new Date(subscription.billing_cycle_anchor * 1000);
          } else {
            // Fallback: calculate from interval
            periodEnd = new Date(periodStart);
            const intervalCount = recurring.interval_count ?? 1;
            if (recurring.interval === "month") {
              periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
            } else if (recurring.interval === "year") {
              periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
            } else {
              // unknown interval fallback
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }
          }
        } else {
          // Non-recurring / free / lifetime subscription
          periodEnd = new Date(periodStart);
          periodEnd.setFullYear(periodEnd.getFullYear() + 100); // or null in DB
        }

        const { error } = await worker
          .from("subscriptions")
          .update({
            status: "active",
            stripe_subscription_status: subscription.status,
            period_starts_at: periodStart.toISOString(),
            period_ends_at: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", subscription.customer as string);

        if (!error) {
          // Optional: send renewal email for free plans
          await sendRenewalSuccessEmail({
            stripeCustomerId: subscription.customer as string,
          });
        } else {
          console.log("Subscription update failed:", error);
        }

        break;
      }
    }
  } catch (error: any) {
    console.error("Webhook DB error:", error);
    return new Response(error, { status: 500 });
  }

  return new Response("subscription process complete", { status: 200 });
}


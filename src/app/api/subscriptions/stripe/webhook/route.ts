import { getPlanFromSubscription, PlanType } from "@/app/account/subscription";
import { sendRenewalSuccessEmail } from "@/app/api/emails/renewalSuccess";
import { SubscriptionCreated } from "@/app/api/emails/subscriptionCreated";
import { setupDB } from "@/lib/db";
import { headers } from "next/headers";
import Stripe from "stripe";
import { UserPlan } from "../../plan/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});


const worker = setupDB();

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");
  const x_plan: Pick<UserPlan, "plan"> = { plan: "Managed WordPress Performance" };

  let event: Stripe.Event;

  try {

    if (!signature) return new Response("Missing signature!", { status: 500 });

    event = stripe.webhooks.constructEvent(
      body,
      signature,
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

        if (session.mode === "payment") {

          await worker.from("one_time_orders").insert({
            user_id: userId as string,
            customer_email: session.customer_details?.email as string,
            stripe_customer_id: session.customer as string,
            amount_total: session.amount_total as number,
            payment_status: session.payment_status as string,
            created_at: new Date().toISOString(),
            currency: session.currency as string,
            quantity: Number(session.metadata?.quantity),
            plan: x_plan.plan
          })

          break;
        }

        if (session.mode === "subscription") {
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

        break;
      }

      /*** SUBSCRIPTION CREATED ***/
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;

        let userId: string | undefined | null = subscription.metadata?.user_id;

        if (!userId) {
          // Fetch from DB if metadata is missing
          const { data: userRow } = await worker
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer as string)
            .maybeSingle();

          userId = userRow?.user_id;
        }

        if (!userId) {
          console.error("No userId found for customer:", subscription.customer);
          return new Response("User not found", { status: 404 });
        }

        // Determine plan

        let activeplan: PlanType = "Free";

        if (subscription.items.data.length > 0) {
          activeplan = getPlanFromSubscription(subscription);
        }

        const currentPeriodEnd = new Date(
          (subscription as any).current_period_end * 1000,
        ).toISOString();

        const { error } = await worker.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            period_starts_at: new Date(
              subscription.start_date * 1000,
            ).toISOString(),
            period_ends_at: currentPeriodEnd,
            status: "active",
            plan: activeplan,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        if (error) {
          console.error("SUBSCRIPTION CREATED UPDATE ERROR:", error);
          return new Response("Database Update Failed", { status: 500 });
        }

        // Send subscription created email
        await SubscriptionCreated({
          stripeCustomerId: subscription.customer as string,
          plan: activeplan as PlanType,
          billingCycleEnd: currentPeriodEnd,
        });

        // send a notification
        const BASE_URL = process.env.NEXT_PUBLIC_PROD_BASE_URL;
        await fetch(`${BASE_URL}/api/notifications/subscription-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_id: subscription.customer,
            message: `You have upgraded to the ${activeplan?.toLowerCase()} plan. You have maximum 2 site slots and 50,000 monthly pageview limit.`,
          }),
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

        // not upgrades (reseting on upgrade can allow people additional quota, revenue leakage)
        if (invoice.billing_reason !== "subscription_cycle") {
          break;
        }

        // get the start and end date (works both monthly and yearly)
        const subscriptionData = invoice.lines?.data?.find(
          (x: any) => x?.type === "subscription",
        );

        if (
          !subscriptionData?.period?.start ||
          !subscriptionData?.period?.end
        ) {
          break;
        }

        const periodStart = new Date(
          subscriptionData.period.start * 1000,
        ).toISOString();
        const nextPeriodEnd = new Date(
          subscriptionData.period.end * 1000,
        ).toISOString();

        const { error } = await worker
          .from("subscriptions")
          .update({
            status: "active",
            stripe_subscription_status: "active",
            updated_at: new Date().toISOString(),
            current_usage: 0, // resets the usage
            period_starts_at: periodStart,
            period_ends_at: nextPeriodEnd,
          })
          .eq("stripe_customer_id", invoice.customer as string);

        if (error) {
          console.log("Subscription update failed: ", error);
        }

        // send email
        await sendRenewalSuccessEmail({
          stripeCustomerId: invoice.customer as string,
        });

        // add a notification
        const BASE_URL = process.env.NEXT_PUBLIC_PROD_BASE_URL;
        await fetch(`${BASE_URL}/api/notifications/subscription-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_id: invoice.customer,
            message: "Your subscription renewal was successful.",
          }),
        });

        break;
      }

      /** CUSTOMER UPDATE */
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const previous = event.data.previous_attributes as any;

        // Skip updates that only changed the current period (i.e., renewal)
        const periodChanged =
          previous?.current_period_start !==
          subscription.current_period_start ||
          previous?.current_period_end !== subscription.current_period_end;

        if (periodChanged) {
          break; // skip renewals
        }

        const periodStart = new Date(subscription.current_period_start * 1000);
        const periodEnd = new Date(subscription.current_period_end * 1000);
        const activePlan = getPlanFromSubscription(subscription);

        // Determine status: cancelled, cancelling, or active
        let status = "active";
        if (subscription.status === "canceled") {
          status = "canceled"; // immediate cancel
        } else if (subscription.cancel_at_period_end) {
          status = "cancelling"; // will cancel at end of period
        }

        const { error } = await worker
          .from("subscriptions")
          .update({
            status,
            plan: activePlan,
            stripe_subscription_status: subscription.status,
            period_starts_at: periodStart.toISOString(),
            period_ends_at: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", subscription.customer as string);

        if (error) {
          console.log("Subscription update failed:", error);
        }

        break;
      }
    }
  } catch (error: any) {
    return new Response(error, { status: 500 });
  }

  return new Response("subscription process complete", { status: 200 });
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api";
import { PlanKey, priceMap } from "@/app/(home)";

export type CheckoutProps = {
  priceKey: PlanKey;
  mode: "subscription" | "payment";
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const worker = setupDB();

export async function POST(request: Request) {
  const { user } = await getSupabaseServerUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { priceKey, mode }: CheckoutProps = await request.json();

    if (!priceKey) {
      return NextResponse.json(
        { error: "Missing priceKey in request body" },
        { status: 400 },
      );
    }

    if (!mode) {
      return NextResponse.json(
        { error: "Missing mode in request body" },
        { status: 400 },
      );
    }

    const isDev = process.env.NODE_ENV === "development";

    const BASE_URL = isDev
      ? process.env.NEXT_PUBLIC_DEV_BASE_URL
      : process.env.NEXT_PUBLIC_PROD_BASE_URL;

    let session;

    if (mode === "subscription") {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        allow_promotion_codes: true,
        saved_payment_method_options: { payment_method_save: "enabled" },

        metadata: {
          user_id: user.id,
        },

        //This puts metadata on the Subscription (event: customer.subscription.created)
        subscription_data: {
          metadata: {
            user_id: user.id,
          },
        },

        line_items: [
          {
            price: priceMap[priceKey as keyof typeof priceMap],
            quantity: 1,
            // adjustable_quantity: {
            //   enabled: false,
            //   minimum: 1,
            //   maximum: 1,
            // },
          },
        ],
        success_url: `${BASE_URL}/account/subscription/success`,
        cancel_url: `${BASE_URL}/account/subscription/cancel`,
      });

      // update on database!!
      await worker
        .from("subscriptions")
        .update({ stripe_session_id: session?.id })
        .eq("user_id", user?.id);

    } else {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_creation: "always",
        allow_promotion_codes: true,
        saved_payment_method_options: { payment_method_save: "enabled" },

        metadata: {
          user_id: user.id,
        },

        // for one time payment instead of subscription_data
        payment_intent_data: {
          metadata: {
            user_id: user.id,
          },
        },

        line_items: [
          {
            price: priceMap[priceKey as keyof typeof priceMap],
            quantity: 1,
            adjustable_quantity: {
              enabled: true,
              minimum: 1,
              maximum: 10,
            },
          },
        ],
        success_url: `${BASE_URL}/account/one-time-payment/required-data`,
        cancel_url: `${BASE_URL}/account/one-time-payment/cancel`,
      });
    }


    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Session creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
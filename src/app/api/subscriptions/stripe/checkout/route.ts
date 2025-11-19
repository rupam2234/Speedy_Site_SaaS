import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { setupDB } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const worker = setupDB();

export async function POST(request: Request) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name) {
          return (await cookieStore).get(name)?.value;
        },
        async set(name, value, options) {
          (await cookieStore).set({ name, value, ...options });
        },
        async remove(name, options) {
          (await cookieStore).delete({ name, ...options });
        },
      },
    }
  );

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { priceId }: any = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing priceId in request body" },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === "development";

    const BASE_URL = isDev
      ? process.env.NEXT_PUBLIC_DEV_BASE_URL
      : process.env.NEXT_PUBLIC_PROD_BASE_URL;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      allow_promotion_codes: true,
      saved_payment_method_options: { payment_method_save: "enabled" },

      metadata: {
        user_id: user.id,
      },

      line_items: [
        {
          price: priceId,
          quantity: 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
            maximum: 10,
          },
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

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Session creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

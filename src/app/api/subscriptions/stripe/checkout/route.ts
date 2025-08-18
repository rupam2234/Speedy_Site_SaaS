import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

export async function POST(request: Request) {
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
      success_url: `${BASE_URL}/success`,
      cancel_url: `${BASE_URL}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Session creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

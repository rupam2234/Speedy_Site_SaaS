import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Product catalog — $299 one-time per site, never recurring (docs/GOALS.md)
const PRICE_MAP: Record<string, { price: string; productType: "managed_wp" }> = {
  managed_wp: {
    price: process.env.STRIPE_PRICE_MANAGED_WP!,
    productType: "managed_wp",
  },
};

export async function POST(req: Request) {
  const { user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { priceKey }: { priceKey?: string } = await req.json();

    // Default to the only product for now; "mode" is accepted but ignored —
    // the business model is one-time payment only (no subscriptions)
    const product = PRICE_MAP[priceKey ?? "managed_wp"];

    if (!product?.price) {
      return NextResponse.json(
        { error: "Unknown product or missing Stripe price configuration" },
        { status: 400 },
      );
    }

    const BASE_URL =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_DEV_BASE_URL
        : process.env.NEXT_PUBLIC_PROD_BASE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: product.price, quantity: 1 }],
      customer_email: user.email ?? undefined,
      // Webhook reads these to provision the entitlement
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        product_type: product.productType,
      },
      // required-data page consumes ?session_id= and calls /api/orders/managed/add
      success_url: `${BASE_URL}/account/one-time-payment/required-data?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/account/one-time-payment/cancel`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to create checkout session", details: err?.message },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "build-placeholder"); // build-safe

// Product catalog — $299 one-time per site, never recurring (docs/GOALS.md)
// `STRIPE_PRICE` is the name used in existing environments; the product-specific
// `STRIPE_PRICE_MANAGED_WP` is preferred when both are present, so a rename can
// roll out without breaking checkout anywhere.
const MANAGED_WP_PRICE =
  process.env.STRIPE_PRICE_MANAGED_WP ?? process.env.STRIPE_PRICE;

const PRICE_MAP: Record<string, { price: string; productType: "managed_wp" }> = {
  managed_wp: {
    price: MANAGED_WP_PRICE ?? "",
    productType: "managed_wp",
  },
};

export async function POST(req: Request) {
  const { user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      priceKey,
      order_id,
      website_name,
    }: { priceKey?: string; order_id?: string | null; website_name?: string | null } =
      await req.json();

    // Default to the only product for now; "mode" is accepted but ignored —
    // the business model is one-time payment only (no subscriptions)
    const product = PRICE_MAP[priceKey ?? "managed_wp"];

    if (!product?.price) {
      return NextResponse.json(
        {
          error:
            "Unknown product or missing Stripe price configuration: set STRIPE_PRICE_MANAGED_WP (or STRIPE_PRICE) to the $299 managed_wp price id",
        },
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
      // Webhook reads these to provision the entitlement and link it to the order
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        product_type: product.productType,
        // Optional: when paying at the end of setup, link the entitlement to
        // the existing order instead of creating a standalone entitlement.
        order_id: order_id ?? "",
        website_name: website_name ?? "",
      },
      // Payment done -> back to the onboarding steps flow. The webhook will
      // link the entitlement to the pending order (if one exists).
      success_url: `${BASE_URL}/dashboard/onboarding`,
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

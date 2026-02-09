import Stripe from "stripe";
import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { GetServerSupabase } from "@/lib/db/getUser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const worker = setupDB();

export async function GET() {
  const { user, error: authError } = await GetServerSupabase();

  if (authError || !user) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { data, error } = await worker
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user?.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const invoices = await stripe.invoices.list({
      customer: data.stripe_customer_id!,
      limit: 10,
    });

    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { getServerSupabase } from "@/lib/db/serverSupabase";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const worker = setupDB();

export async function GET() {
  const { user, error: authError } = await getServerSupabase();

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
      console.log("Error fetching stripe customer ID", error);
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
    console.error("Error retrieving customer or invoices:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

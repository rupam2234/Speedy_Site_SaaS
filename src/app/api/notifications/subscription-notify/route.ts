import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  customer_id: string;
  message: string;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { customer_id, message }: Props = await req.json();

  if (!customer_id) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  try {
    const { data: customerData, error: customerError } = await worker
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customer_id)
      .maybeSingle();

    if (customerError) {
      throw new Error(customerError.message ?? "Unable to get customer");
    }

    // if we have the customer we send a notification to them

    if (customerData?.user_id) {
      const { error } = await worker.from("notifications").insert({
        message: message,
        user_id: customerData?.user_id,
        type: "Billing",
        read: false,
        link: "/account/subscription",
      });

      if (error) {
        throw new Error(error.message ?? "Failed to insert notification");
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted error" },
      { status: 500 },
    );
  }
}

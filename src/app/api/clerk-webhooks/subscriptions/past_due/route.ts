import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const helper = setupDB();

// when subscription past due we send an email to user that your subscription has passed it's due period

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.data || !body.data.items) {
      return NextResponse.json(
        { message: "Missing subscription data" },
        { status: 400 }
      );
    }

    const due_item = body.data.items.find(
      (item: any) => item.status === "past_due"
    );

    if (!due_item) {
      return NextResponse.json(
        { message: "No past_due subscription found" },
        { status: 404 }
      );
    }

    const subscription_data = {
      activePlan: "free_user",
      has_lab_access: false,
      has_rum: false,
      latest_payment_id: body.data?.latest_payment_id ?? "",
      plan_id: due_item.plan?.id ?? "",
      subscription_created_at: body.data?.created_at
        ? new Date(body.data.created_at).toISOString()
        : null,

      period_start: due_item.period_start
        ? new Date(due_item.period_start).toISOString()
        : null,

      period_end: due_item.period_end
        ? new Date(due_item.period_end).toISOString()
        : null,

      subscription_status: body.data?.status ?? "",
      subscription_id: body.data?.id ?? "",
    };

    const { error } = await helper
      .from("users")
      .update({
        period_start: subscription_data.period_start,
        period_end: subscription_data.period_end,
        plan_id: subscription_data.plan_id,
        subscription_status: subscription_data.subscription_status,
        latest_payment_id: subscription_data.latest_payment_id,
        activePlan: subscription_data.activePlan,
        subscription_created_at: subscription_data.subscription_created_at,
        has_lab_access: subscription_data.has_lab_access,
        has_rum: subscription_data.has_rum,
      })
      .eq("subscription_id", subscription_data.subscription_id)
      .select();

    if (error) {
      return NextResponse.json(
        { message: "Error updating user subscription", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Subscription due data updated",
        subscription_data,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: "Invalid request", error: err.message },
      { status: 400 }
    );
  }
}

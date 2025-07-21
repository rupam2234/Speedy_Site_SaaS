import { order_per_plan } from "@/data/perPlan";
import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const helper = setupDB();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.data || !body.data.items) {
      return NextResponse.json(
        { message: "Missing subscription data" },
        { status: 400 }
      );
    }

    const activeItem = body.data.items.find(
      (item: any) => item.status === "active" || item.status === "upcoming"
    );

    if (!activeItem) {
      return NextResponse.json(
        { message: "No active subscription plan found" },
        { status: 404 }
      );
    }

    const subscription_data = {
      activePlan: activeItem.plan.slug,
      has_lab_access:
        activeItem.plan.slug === "pro" || activeItem.plan.slug === "basic_plan",
      has_rum: activeItem.plan.slug === "pro",
      latest_payment_id: body.data?.latest_payment_id ?? "",
      max_sites:
        activeItem.plan.slug === "pro"
          ? order_per_plan.pro
          : activeItem.plan.slug === "basic_plan"
          ? order_per_plan.basic_plan
          : order_per_plan.free_users,
      plan_id: activeItem.plan?.id ?? "",

      subscription_created_at: body.data?.created_at
        ? new Date(body.data.created_at).toISOString()
        : null,

      period_start: activeItem.period_start
        ? new Date(activeItem.period_start).toISOString()
        : null,

      period_end: activeItem.period_end
        ? new Date(activeItem.period_end).toISOString()
        : null,

      subscription_status: body.data?.status ?? "",
      subscription_id: body.data?.id ?? "",
    };

    const user_id = body.data?.payer?.user_id ?? "";

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
        max_sites: subscription_data.max_sites,
        subscription_id: subscription_data.subscription_id,
      })
      .eq("id", user_id)
      .select();

    if (error) {
      return NextResponse.json(
        { message: "Error updating user subscription", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "User updated with subscription data",
        activeItem,
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

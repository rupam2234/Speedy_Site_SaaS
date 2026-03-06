import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { OrderData } from "../../dataTypes";

const worker = setupDB();

export async function POST(req: Request) {
  try {
    const { orderData, user_id }: { orderData: OrderData; user_id: any } =
      await req.json();

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user authentication" },
        { status: 401 }
      );
    }

    if (!orderData) {
      return NextResponse.json(
        { error: "Invalid or missing order data" },
        { status: 400 }
      );
    }

    // Fetch subscription details
    const { data, error } = await worker
      .from("subscription_with_limit")
      .select("plan, current_usage, usage_limit, status")
      .eq("user_id", user_id);

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        {
          error: "Error fetching subscription details or no subscription found",
        },
        { status: 500 }
      );
    }

    const subscription = data[0];
    // const isBlocked = subscription.degradation_policy === "block";
    const isOverUsage =
      subscription.current_usage !== null &&
      subscription.usage_limit !== null &&
      subscription.current_usage >= subscription.usage_limit;

    // Check if website already exists
    const { data: existingSite, error: siteError } = await worker
      .from("orders")
      .select("*")
      .eq("user_id", user_id)
      .eq("website_name", orderData.website_name)
      .maybeSingle();

    if (siteError) {
      return NextResponse.json(
        { error: "Error checking existing site" },
        { status: 500 }
      );
    }

    if (existingSite) {
      return NextResponse.json(
        { message: `This site is already added: ${orderData.website_name}` },
        { status: 409 }
      );
    }

    if (isOverUsage) {
      return NextResponse.json(
        {
          message: "Usage limit reached. Please upgrade your plan to continue.",
          usageLimit: subscription.usage_limit,
          currentUsage: subscription.current_usage,
          plan: subscription.plan,
        },
        { status: 403 }
      );
    }

    // If all checks pass, insert new order
    const {
      data: insertedOrder,
      error: insertError,
      status: insertStatus,
    } = await worker
      .from("orders")
      .insert({
        website_name: orderData.website_name,
        website_address: orderData.website_address,
        favicon_file: orderData.favicon_file,
        order_status: orderData.order_status,
        user_id,
      })
      .select();

    if (insertError) {
      return NextResponse.json(
        {
          error: "Failed to insert order data",
          details: insertError.message,
        },
        { status: insertStatus }
      );
    }

    return NextResponse.json(
      {
        message: "Order data inserted successfully",
        order: insertedOrder ? insertedOrder[0] : null,
        plan: subscription.plan,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

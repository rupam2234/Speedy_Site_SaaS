import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { OrderData } from "@/app/api";

const worker = setupDB();

export async function POST(req: Request) {
  try {
    const { orderData, user_id }: { orderData: OrderData; user_id: any } =
      await req.json();

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user authentication" },
        { status: 401 },
      );
    }

    if (!orderData) {
      return NextResponse.json(
        { error: "Invalid or missing order data" },
        { status: 400 },
      );
    }

    // Check if user has an active managed_wp service
    const { data: service, error: serviceError } = await worker
      .from("user_services")
      .select("id, status, metadata")
      .eq("user_id", user_id)
      .eq("service_type", "managed_wp")
      .eq("status", "active")
      .maybeSingle();

    if (serviceError) {
      return NextResponse.json(
        { error: "Error checking service status" },
        { status: 500 },
      );
    }

    if (!service) {
      return NextResponse.json(
        {
          error: "No active WordPress Performance Optimization service found. Please purchase a service first.",
        },
        { status: 403 },
      );
    }

    // Check if website already exists for this user
    const { data: existingSite, error: siteError } = await worker
      .from("orders")
      .select("*")
      .eq("user_id", user_id)
      .eq("website_name", orderData.website_name)
      .maybeSingle();

    if (siteError) {
      return NextResponse.json(
        { error: "Error checking existing site" },
        { status: 500 },
      );
    }

    if (existingSite) {
      return NextResponse.json(
        { message: `${orderData.website_name} already exists.` },
        { status: 409 },
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
        product_type: "managed_wp",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: "Failed to insert order data",
          details: insertError.message,
        },
        { status: insertStatus },
      );
    }

    // Link the order to the user_service
    await worker
      .from("user_services")
      .update({ order_id: insertedOrder.order_id, updated_at: new Date().toISOString() })
      .eq("id", service.id);

    return NextResponse.json(
      {
        message: "Order data inserted successfully",
        order: insertedOrder ? insertedOrder : null,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
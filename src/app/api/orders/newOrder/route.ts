import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { OrderData } from "@/app/api";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";

const worker = setupDB();

const FREE_SITE_LIMIT = 1;

export async function POST(req: Request) {
  try {
    const {
      orderData,
      user_id: bodyUserId,
    }: { orderData: OrderData; user_id?: string } = await req.json();

    // SECURITY: identity always comes from the session, never the body.
    // (the body user_id was previously trusted — IDOR)
    const { user, error: authError } = await getSupabaseServerUser();
    const user_id = user?.id;

    if (authError || !user_id) {
      return NextResponse.json(
        { error: "Missing user authentication" },
        { status: 401 },
      );
    }

    if (bodyUserId && bodyUserId !== user_id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    if (!orderData || !orderData.website_name || !orderData.website_address) {
      return NextResponse.json(
        { error: "Invalid or missing order data" },
        { status: 400 },
      );
    }

    // Fetch the user's services once and derive the entitlement
    const { data: services, error: serviceError } = await worker
      .from("user_services")
      .select("id, service_type, status, metadata")
      .eq("user_id", user_id);

    if (serviceError) {
      return NextResponse.json(
        { error: "Error checking service status" },
        { status: 500 },
      );
    }

    const activeManaged = services?.find(
      (s) => s.service_type === "managed_wp" && s.status === "active"
    );
    const activeFree = services?.find(
      (s) => s.service_type === "free" && s.status === "active"
    );

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

    if (activeManaged) {
      // Paid tier: enforce the metadata site limit server-side
      const siteLimit =
        (activeManaged.metadata as Record<string, any>)?.site_limit ?? 1;

      const { count, error: countError } = await worker
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("product_type", "managed_wp");

      if (countError) {
        return NextResponse.json(
          { error: "Error checking site limit" },
          { status: 500 },
        );
      }

      if (count !== null && count >= siteLimit) {
        return NextResponse.json(
          { error: `Site limit reached (${siteLimit}).` },
          { status: 403 },
        );
      }

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

      // Link the order to the managed_wp service
      await worker
        .from("user_services")
        .update({ order_id: insertedOrder.order_id, website_name: insertedOrder.website_name, updated_at: new Date().toISOString() })
        .eq("id", activeManaged.id);

      return NextResponse.json(
        {
          message: "Order data inserted successfully",
          order: insertedOrder ? insertedOrder : null,
        },
        { status: 200 },
      );
    }

    if (activeFree) {
      // Free tier: exactly one connected site (CrUX web vitals)
      const { count, error: countError } = await worker
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);

      if (countError) {
        return NextResponse.json(
          { error: "Error checking site limit" },
          { status: 500 },
        );
      }

      if (count !== null && count >= FREE_SITE_LIMIT) {
        return NextResponse.json(
          {
            error:
              "Free plan allows up to three connected sites. Upgrade to WordPress Performance Optimization to add more.",
          },
          { status: 403 },
        );
      }

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
          product_type: "free",
        })
        .select("*")
        .single();

      if (insertError) {
        // uniq_orders_free_per_user makes double-submissions fail safely here
        return NextResponse.json(
          {
            error: "Failed to insert order data",
            details: insertError.message,
          },
          { status: insertStatus },
        );
      }

      // Bind the free entitlement to the connected site
      await worker
        .from("user_services")
        .update({
          order_id: insertedOrder.order_id,
          website_name: insertedOrder.website_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeFree.id);

      return NextResponse.json(
        {
          message: "Order data inserted successfully",
          order: insertedOrder ? insertedOrder : null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        error:
          "No active service found. Connect your free site or purchase a WordPress Performance Optimization service first.",
      },
      { status: 403 },
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
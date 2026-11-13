import { setupDB } from "@/lib/db";
import { NextResponse, after } from "next/server";
import { OrderData } from "@/app/api";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { runAutoAssignmentIfEnabled } from "@/lib/services/assignmentService";

export const runtime = "nodejs";

const worker = setupDB();

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
      .select("id, service_type, status, metadata, order_id, website_name")
      .eq("user_id", user_id);

    if (serviceError) {
      return NextResponse.json(
        { error: "Error checking service status" },
        { status: 500 },
      );
    }

    // Each managed_wp entitlement covers the site it is bound to, so a new site
    // needs one that is still unused. Accounts that already paid for this site
    // are handled by the existing-site check below.
    const activeManaged = (services ?? []).find((s) => {
      if (s.service_type !== "managed_wp" || s.status !== "active") return false;
      const limit = (s.metadata as Record<string, any>)?.site_limit ?? 1;
      const used = s.website_name ? 1 : 0;
      return used < limit;
    });
    // No free tier: a site can only be connected behind its own managed_wp
    // entitlement, which is what the setup flow sells before this step.
    if (!activeManaged) {
      return NextResponse.json(
        {
          error:
            "Connecting this site needs its own WordPress Performance Optimization service. Complete the setup payment first.",
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

    if (activeManaged) {
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

      // Run auto-assignment in a separate background task when enabled
      if (insertedOrder.order_status) {
        after(async () => {
          try {
            await runAutoAssignmentIfEnabled(insertedOrder.order_id);
          } catch (bgError) {
            console.error(
              `Background auto-assignment failed for order ${insertedOrder.order_id}:`,
              bgError,
            );
          }
        });
      }

      return NextResponse.json(
        {
          message: "Order data inserted successfully",
          order: insertedOrder ? insertedOrder : null,
        },
        { status: 200 },
      );
    }

    // Unreachable: the entitlement check above already 403s without an active
    // managed_wp service, and orders are only ever managed_wp now.
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
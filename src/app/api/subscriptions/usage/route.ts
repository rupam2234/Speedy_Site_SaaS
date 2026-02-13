import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const AUTH_TOKEN = process.env.USAGE_COUNTER_CRON;

if (!AUTH_TOKEN) {
  throw new Error("Missing USAGE_COUNTER_CRON environment variable");
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  try {
    // Check auth header
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
      return NextResponse.json(
        { error: "Invalid Authorization token" },
        { status: 401 }
      );
    }

    // Get usage counts by domain (yesterday)
    const { data: usageData, error: usageError } = await worker.rpc(
      "get_yesterday_usage_counts"
    );

    if (usageError) {
      return NextResponse.json(
        { error: usageError.details || "Failed to get usage data" },
        { status: 500 }
      );
    }

    if (!usageData || !Array.isArray(usageData)) {
      return NextResponse.json(
        { error: "RPC returned no usage data" },
        { status: 500 }
      );
    }

    // Fetch current usage from orders table
    const { data: currentOrders, error: currentOrdersError } = await worker
      .from("orders")
      .select("website_name, usage_by_site");

    if (currentOrdersError) {
      return NextResponse.json(
        { error: currentOrdersError.details || "Failed to fetch orders" },
        { status: Number(currentOrdersError.code) || 500 }
      );
    }

    // Build lookup map for fast matching
    const currentUsageMap = Object.fromEntries(
      currentOrders.map((o) => [
        o.website_name.trim().toLowerCase(),
        o.usage_by_site || 0,
      ])
    );

    // Update orders usage
    await Promise.all(
      usageData.map(async (x) => {
        const domainKey = x.domain_name.trim().toLowerCase();
        const current = currentUsageMap[domainKey];

        if (current !== undefined) {
          const newUsage = current + x.usage_count;

          const { error } = await worker
            .from("orders")
            .update({ usage_by_site: newUsage })
            .eq("website_name", x.domain_name);

          if (error) {
            console.error(`Error updating order ${x.domain_name}:`, error);
          } else {
            console.log(
              `Updated order ${x.domain_name}: ${current} + ${x.usage_count} = ${newUsage}`
            );
          }
        } else {
          console.warn(`Order not found for domain: ${x.domain_name}`);
        }
      })
    );

    // Aggregate usage by user
    const { data: dailyUsage, error: dailyUsageError } = await worker.rpc(
      "daily_aggregate_usage_by_userid"
    );

    if (dailyUsageError) {
      return NextResponse.json(
        {
          error:
            dailyUsageError.details || "Error fetching daily usage for users",
        },
        { status: 500 }
      );
    }

    // Update subscriptions usage (only existing rows)
    console.log("Updating subscriptions usage...");
    await Promise.all(
      dailyUsage.map(async (x) => {
        const { user_id, total_usage } = x;

        // Fetch existing usage
        const { data: existing, error: fetchError } = await worker
          .from("subscriptions")
          .select("current_usage")
          .eq("user_id", user_id)
          .single();

        if (fetchError) {
          console.warn(
            `Skipping subscription update for ${user_id} (not found):`,
            fetchError.details || fetchError.message
          );
          return;
        }

        const current = existing?.current_usage ?? 0;
        const newUsage = current + total_usage;

        const { error: updateError } = await worker
          .from("subscriptions")
          .update({ current_usage: newUsage })
          .eq("user_id", user_id);

        if (updateError) {
          console.error(`Error updating subscription for ${user_id}:`, updateError);
        } else {
          console.log(`Updated subscription ${user_id}: ${current} + ${total_usage} = ${newUsage}`);
        }
      })
    );

    return NextResponse.json(
      {
        message: "Usage data updated successfully",
        domainsUpdated: usageData.length,
        usersUpdated: dailyUsage.length,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Unexpected server error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

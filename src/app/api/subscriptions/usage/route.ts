import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const AUTH_TOKEN = process.env.USAGE_COUNTER_CRON;

if (!AUTH_TOKEN) {
  throw new Error("Missing USAGE_COUNTER_CRON environment variable");
}

const worker = setupDB();

export async function POST(req: NextRequest) {

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

  try {

    // Get usage counts by domain (yesterday)
    const { data: usageData, error: usageError } = await worker.rpc(
      "get_yesterday_usage_counts"
    );

    if (usageError) {
      throw new Error(usageError.message || "failed to get usage data")
    }

    if (!usageData || !Array.isArray(usageData)) {
      throw new Error("RPC returned no usage data");
    }

    // Fetch current usage from orders table
    const { data: currentOrders, error: currentOrdersError } = await worker
      .from("orders")
      .select("website_name, usage_by_site");

    if (currentOrdersError) {
      throw new Error(currentOrdersError.message || "failed to fetch order usage");
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
            .eq("website_name", x.domain_name.trim());

            if (error) {
              console.error(`Failed to update order ${x.domain_name}:`, error.message || error);
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
      throw new Error(dailyUsageError.message || "Error fetching daily usage for users")
    }

    // Update subscriptions usage (only existing rows)
    await Promise.all(
      dailyUsage.map(async (x) => {
        const { user_id, total_usage } = x;
        const { error: updateError } = await worker
          .from("subscriptions")
          .update({ current_usage: total_usage })
          .eq("user_id", user_id);

          if (updateError) {
            console.error(
              `Failed to update subscription for ${user_id}:`,
              updateError.message || updateError
            );
          } else {
            console.log(`Updated subscription ${user_id} to usage: ${total_usage}`);
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
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

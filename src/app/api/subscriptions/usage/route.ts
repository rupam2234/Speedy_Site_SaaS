import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const AUTH_TOKEN = process.env.USAGE_COUNTER_CRON;

if (!AUTH_TOKEN) {
  throw new Error("Missing USAGE_COUNTER_CRON environment variable");
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  try {
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

    // Update usage_by_site in orders table
    await Promise.all(
      usageData.map(async (x) => {
        const { error } = await worker
          .from("orders")
          .update({ usage_by_site: x.usage_count })
          .eq("website_name", x.domain_name);

        if (error) {
          console.error(`Error updating order for ${x.domain_name}:`, error);
        }
      })
    );

    // Get daily aggregated usage by user ID
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

    // Update current_usage in subscriptions table
    await Promise.all(
      dailyUsage.map(async (x) => {
        // Fetch current usage
        const { data: existing, error: fetchError } = await worker
          .from("subscriptions")
          .select("current_usage")
          .eq("user_id", x.user_id)
          .single();

        if (fetchError) {
          console.error(
            `Error fetching current usage for ${x.user_id}:`,
            fetchError
          );
          return;
        }

        const current = existing?.current_usage ?? 0;
        const newUsage = current + x.total_usage;

        // Update usage
        const { error: updateError } = await worker
          .from("subscriptions")
          .update({ current_usage: newUsage })
          .eq("user_id", x.user_id);

        if (updateError) {
          console.error(`Error updating usage for ${x.user_id}:`, updateError);
        }
      })
    );

    // Final response
    return NextResponse.json(
      {
        message: "Usage data updated successfully",
        domainsUpdated: usageData.length,
        usersUpdated: dailyUsage?.length ?? 0,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Unexpected server error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

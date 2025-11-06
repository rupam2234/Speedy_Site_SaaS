import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain_name, date_range = "7days" }: any = body;

    if (!domain_name) {
      return NextResponse.json(
        { error: "domain_name is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = await Promise.allSettled([
      supabase.rpc("user_happiness", {
        p_date_range: date_range,
        p_domain: domain_name,
      }),
      supabase.rpc("get_web_vitals_metrics", {
        p_domain: domain_name,
        p_date_range: date_range,
      }),
      // supabase.rpc("get_analytics_by_device_and_country", {
      //   p_time_range: date_range,
      //   p_domain_name: domain_name,
      // }),
      // supabase.rpc("get_ai_citation", {
      //   p_domain_name: domain_name,
      // }),
    ]);

    const [happiness, vitals] = results;

    // Handle errors
    const failed = results
      .map((res, idx) =>
        res.status === "rejected" || res.value?.error
          ? {
              rpc: ["user_happiness", "web_vitals"][idx],
              reason:
                res.status === "rejected"
                  ? res.reason?.message || res.reason
                  : res.value.error?.message,
            }
          : null
      )
      .filter(Boolean);

    if (failed.length > 0) {
      return NextResponse.json(
        {
          error: "One or more RPC calls failed",
          details: failed,
        },
        { status: 500 }
      );
    }

    // All succeeded
    return NextResponse.json(
      {
        domain_name,
        time_period: getTimePeriodDescription(date_range),
        metrics: {
          userHappiness: (happiness as PromiseFulfilledResult<any>).value.data,
          webVitals: (vitals as PromiseFulfilledResult<any>).value.data,
          // analytics: (analytics as PromiseFulfilledResult<any>).value.data,
          // ai_citation: (citation as PromiseFulfilledResult<any>).value.data,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}

function getTimePeriodDescription(range: string): string {
  const now = new Date();
  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  switch (range) {
    case "24hours":
      return `Last 24 hours (since ${now.toISOString().split("T")[0]})`;
    case "7days":
      return `Last 7 days (since ${daysAgo(7)})`;
    case "30days":
      return `Last 30 days (since ${daysAgo(30)})`;
    case "90days":
      return `Last 90 days (since ${daysAgo(90)})`;
    default:
      return "Custom time period";
  }
}

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain_name, date_range = "7days" } = body;

    if (!domain_name) {
      return NextResponse.json(
        { error: "domain_name is required" },
        { status: 400 }
      );
    }

    const validRanges = ["24hours", "7days", "30days", "90days", "360days"];
    if (!validRanges.includes(date_range)) {
      return NextResponse.json(
        {
          error: "Invalid date_range",
          message: `Must be one of: ${validRanges.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const controlled_date_range =
      date_range === "24hours"
        ? "24hours"
        : date_range === "7days"
        ? "7days"
        : "7days";

    const parsed_end_date = null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.rpc("get_filtered_rum_metrics", {
      p_domain_name: domain_name,
      p_date_range: controlled_date_range,
    });

    if (error) {
      return NextResponse.json(
        {
          error: "RPC call failed",
          details: error.message,
        },
        { status: 500 }
      );
    }

    const results = {
      aggregated_metrics: null,
      comparison_metrics: null,
      top_countries: null,
    };

    if (data && Array.isArray(data)) {
      data.forEach((item: { result_type: string; result_data: any }) => {
        switch (item.result_type) {
          case "filtered_rum_aggregated_metrics":
            results.aggregated_metrics = item.result_data;
            break;
          case "filtered_rum_comparison_metrics":
            results.comparison_metrics = item.result_data;
            break;
          case "filtered_rum_top_countries":
            results.top_countries = item.result_data;
            break;
        }
      });
    }

    const missingResults = Object.keys(results).filter(
      (key) => results[key as keyof typeof results] === null
    );
    if (missingResults.length > 0) {
      return NextResponse.json(
        {
          error: "Incomplete data returned",
          details: `Missing result types: ${missingResults.join(", ")}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        domain_name,
        time_period: getTimePeriodDescription(
          controlled_date_range,
          parsed_end_date
        ),
        metrics: results,
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

function getTimePeriodDescription(
  range: string,
  end_date: string | null
): string {
  const now = end_date ? new Date(end_date) : new Date();
  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  const adjustedDays =
    range === "24hours" ? 1 : parseInt(range.replace("days", ""));
  const startDate = daysAgo(adjustedDays);

  switch (range) {
    case "24hours":
      return `Last 24 hours (since ${startDate} to ${daysAgo(1)})`;
    case "7days":
      return `Last 7 days (since ${startDate} to ${daysAgo(1)})`;
    case "30days":
      return `Last 7 days (since ${startDate} to ${daysAgo(
        1
      )}) (limited to 7 days for dashboard)`;
    case "90days":
      return `Last 7 days (since ${startDate} to ${daysAgo(
        1
      )}) (limited to 7 days for dashboard)`;
    case "360days":
      return `Last 7 days (since ${startDate} to ${daysAgo(
        1
      )}) (limited to 7 days for dashboard)`;
    default:
      return "Custom time period";
  }
}

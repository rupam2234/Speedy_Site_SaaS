import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get domain_name and optional date_range from request body
    const body = await request.json();
    const { domain_name, date_range = "30days" } = body;

    // Validate domain_name parameter
    if (!domain_name) {
      return NextResponse.json(
        { error: "domain_name is required in the request body" },
        { status: 400 }
      );
    }

    // Validate date_range parameter
    const validDateRanges = ["24hours", "7days", "30days", "90days"];
    if (!validDateRanges.includes(date_range)) {
      return NextResponse.json(
        {
          error: "Invalid date_range parameter",
          message: `date_range must be one of: ${validDateRanges.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for database functions

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get human-readable time period description
    const getTimePeriodDescription = (range: string): string => {
      const now = new Date();
      switch (range) {
        case "24hours":
          return `Last 24 hours (since ${now.toISOString().split("T")[0]})`;
        case "7days":
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          return `Last 7 days (since ${
            sevenDaysAgo.toISOString().split("T")[0]
          })`;
        case "30days":
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return `Last 30 days (since ${
            thirtyDaysAgo.toISOString().split("T")[0]
          })`;
        case "90days":
          const ninetyDaysAgo = new Date(now);
          ninetyDaysAgo.setDate(now.getDate() - 90);
          return `Last 90 days (since ${
            ninetyDaysAgo.toISOString().split("T")[0]
          })`;
        default:
          return `Custom time period`;
      }
    };

    // Execute the query using our updated function
    const { data, error } = await supabase.rpc("get_ai_citation_metrics", {
      p_date_range: date_range,
      p_domain_filter: domain_name,
    });

    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json(
        { error: "Database query failed", details: error.message },
        { status: 500 }
      );
    }

    // Return the results
    return NextResponse.json(
      {
        domain_name: domain_name,
        time_period: getTimePeriodDescription(date_range),
        metrics: data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "max-age=300", // Cache for 5 minutes
        },
      }
    );
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json();
    let { domain_name } = body;
    const date_range: string = body.date_range;

    if (!domain_name) {
      return NextResponse.json(
        { error: "domain_name is required in the request body" },
        { status: 400 }
      );
    }

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const getTimePeriodDescription = (range: string): string => {
      const now = new Date();
      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      switch (range) {
        case "24hours":
          return `Last 24 hours (since ${formatDate(now)})`;
        case "7days":
          const seven = new Date(now);
          seven.setDate(now.getDate() - 7);
          return `Last 7 days (since ${formatDate(seven)})`;
        case "30days":
          const thirty = new Date(now);
          thirty.setDate(now.getDate() - 30);
          return `Last 30 days (since ${formatDate(thirty)})`;
        case "90days":
          const ninety = new Date(now);
          ninety.setDate(now.getDate() - 90);
          return `Last 90 days (since ${formatDate(ninety)})`;
        default:
          return `Custom time period`;
      }
    };

    // Normalize and try domain variants: non-www first, then www
    const strippedDomain = domain_name.replace(/^www\./i, "");
    const domainVariants = [strippedDomain, `www.${strippedDomain}`];

    let data = null;
    let queryError = null;

    for (const variant of domainVariants) {
      const result = await supabase.rpc("get_lcp_image_metrics", {
        p_domain_name: variant,
        p_time_range: date_range,
      });

      if (result.error) {
        queryError = result.error;
        continue;
      }

      if (result.data && result.data.length > 0) {
        data = result.data;
        domain_name = variant; // Use the working domain
        break;
      }
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "No data found for provided domain (tried with and without www).",
          details: queryError?.message || null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        domain_name,
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

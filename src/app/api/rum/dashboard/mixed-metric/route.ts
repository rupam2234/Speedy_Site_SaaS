import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json();
    const date_range: string = body.date_range;

    if (!body.domain_name) {
      return NextResponse.json(
        { error: "domain_name is required in the request body" },
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

    // Normalize and try domain variants: non-www first, then www
    const strippedDomain = body.domain_name.replace(/^www\./i, "");
    const domainVariants = [strippedDomain, `www.${strippedDomain}`];

    let data = null;
    let queryError = null;

    for (const variant of domainVariants) {
      const result = await supabase.rpc("dashboard_multimetrix", {
        domain_name_param: variant,
        date_range_days: date_range,
      });

      if (result.error) {
        queryError = result.error;
        continue;
      }

      if (result.data && result.data.length > 0) {
        data = result.data;
        body.domain_name = variant; // Use the working domain
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

    const domain = body.domain_name;

    return NextResponse.json(
      {
        domain,
        time_period: date_range,
        metrics: data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
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

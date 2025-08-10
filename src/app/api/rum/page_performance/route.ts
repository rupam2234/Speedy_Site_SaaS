import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { p_domain } = body;
    const hours: number = body.hours;

    if (!p_domain) {
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

    let data = null;
    let queryError = null;

    const result = await supabase.rpc("page_performance_analysis", {
      p_domain: p_domain,
      p_hours: hours,
    });

    if (result.error) {
      queryError = result.error;
    }

    if (result.data && result.data.length > 0) {
      data = result.data;
      p_domain = p_domain; // Use the working domain
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
        p_domain,
        time_period: hours,
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

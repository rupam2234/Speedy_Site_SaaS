import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  const body: { dateRange: string; domain: string } = await req.json();

  if (!body) {
    return NextResponse.json(
      { message: "Missing request body" },
      { status: 400 }
    );
  }

  try {
    const { error, data } = await worker.rpc("top_landing_page", {
      p_date_range: body.dateRange,
      p_domain_name: body.domain,
    });

    if (error) {
      console.error("Supabase RPC Error:", error);
      return NextResponse.json(
        { message: "Unable to fetch top landing pages" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Error in fetching top landing pages",
        error,
      },
      { status: 500 }
    );
  }
}

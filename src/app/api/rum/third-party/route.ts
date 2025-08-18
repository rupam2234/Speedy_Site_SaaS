import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  if (!req) {
    return NextResponse.json(
      {
        message: "Bad request",
      },
      { status: 402 }
    );
  }

  const { domain, time_range }: any = await req.json();

  try {
    const { data, error } = await worker.rpc("third_party_domains", {
      site_filter: domain,
      time_range: time_range,
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
        domain_name: domain,
        metrics: data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "max-age=300", // Cache for 5 minutes
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

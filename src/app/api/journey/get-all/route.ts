import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { message: "Missing domain name" },
        { status: 400 }
      );
    }

    // Fetch site details
    const { data: siteData, error: siteError } = await worker
      .from("orders")
      .select("order_id, journey_count")
      .eq("website_name", domain)
      .limit(1)
      .single();

    if (siteError || !siteData) {
      return NextResponse.json(
        { message: "Unable to retrieve site information", error: siteError },
        { status: 500 }
      );
    }

    const { order_id, journey_count } = siteData;

    // get journeys
    const { data: journeys, error: journeyErr } = await worker
      .from("journeys")
      .select("name, created_at, id")
      .eq("order_id", order_id);

    if (journeyErr || !journeys) {
      return NextResponse.json(
        { message: "Error getting journeys", error: journeyErr },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Journey data fetched successfully",
        journeyData: journeys,
        JourneyCount: journey_count,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: "Unexpected server error", error: err?.message },
      { status: 500 }
    );
  }
}

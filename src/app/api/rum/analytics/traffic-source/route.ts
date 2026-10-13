import { NextRequest, NextResponse } from "next/server";
import { fetchFromAnalyticsWorker } from "@/lib/analytics/workers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const domain = searchParams.get("domain");

    if (!startDate || !endDate || !domain) {
      return NextResponse.json(
        { message: "startDate, endDate and domain are required" },
        { status: 400 },
      );
    }

    const data = await fetchFromAnalyticsWorker(
      "trafficSource",
      "/get-source",
      { startDate, endDate, domain },
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}


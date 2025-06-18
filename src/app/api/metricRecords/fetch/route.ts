import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";

export type fetchMetric = {
  website: string;
};

const worker = setupDB();

export async function POST(req: Request) {
  try {
    const body: fetchMetric[] = await req.json();

    if (body.length === 0) {
      return NextResponse.json(
        { message: "invalid site parameters!" },
        { status: 404 }
      );
    }

    const websiteNames = body.map((item) => item.website);

    const { data, error, status } = await worker
      .from("metric_data")
      .select("*")
      .in(`website_name`, websiteNames)
      .gte(
        "created_at",
        new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // last 10 days of data
      )
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          message: "failed to fetch metric data",
          error: error.message,
        },
        { status: status || 500 }
      );
    } else {
      return NextResponse.json(
        {
          message: "Metric data: successfully fetched",
          data,
        },
        { status: status || 200 }
      );
    }
  } catch (error) {
    console.log("Error while fetching metric data:", error);
  }
}

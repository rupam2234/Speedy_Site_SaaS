import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { urls } = body;

    // if `url` is an array of strings
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { message: "url must be an array" },
        { status: 400 }
      );
    }

    const { data, error } = await worker
      .from("pageperf_data")
      .select("*")
      .in("page_address", urls); //`in` to filter rows that match any of the URLs

    if (error) {
      console.error("Performance data query failed:", error);
      return NextResponse.json(
        {
          message: "Performance data query failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data,
        message: "Data fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching synthetic performance data:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

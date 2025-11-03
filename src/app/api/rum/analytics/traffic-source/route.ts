import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();

    if (!body) {
      return NextResponse.json(
        { message: "Missing request body" },
        { status: 400 }
      );
    }

    const { range, domain, key } = body;

    if (!range || !domain || !key) {
      return NextResponse.json(
        { message: "Missing required parameters (range, domain, key)" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://traffic-source-cron.thespeedysite.workers.dev/get-source?range=${encodeURIComponent(
        range
      )}&domain=${encodeURIComponent(domain)}&key=${encodeURIComponent(key)}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: "Error fetching traffic source" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    console.error("Error in POST /traffic-source:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

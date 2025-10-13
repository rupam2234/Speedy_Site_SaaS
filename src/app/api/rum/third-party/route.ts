import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  if (!req) {
    return NextResponse.json({ message: "Bad request" }, { status: 402 });
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

    const normalizedData = (data as any[]).map((item) => ({
      ...item,
      top_domains: item.top_domains.map((t: any) => {
        let parsedDomain;
        try {
          parsedDomain = JSON.parse(t.domain);
        } catch (e) {
          console.error(`Invalid domain JSON: ${e}`, t.domain);
          parsedDomain = { domain: t.domain };
        }

        return {
          ...t,
          domain: parsedDomain,
        };
      }),
    }));

    return NextResponse.json(
      {
        domain_name: domain,
        metrics: normalizedData,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "max-age=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

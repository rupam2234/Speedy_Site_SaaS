import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

function normalizeDomain(domain: string): string {
  return domain.startsWith("www.") ? domain.slice(4) : domain;
}

export async function POST(req: NextRequest) {
  if (!req) {
    return NextResponse.json({ message: "Missing req body" }, { status: 400 });
  }

  try {
    const body = await req.json();
    let { domain_name } = body;

    if (!domain_name) {
      return NextResponse.json(
        { message: "Missing domain_name in request body" },
        { status: 400 }
      );
    }

    // Normalize domain (remove www if exists)
    const normalizedDomain = normalizeDomain(domain_name);

    // First query without www
    let { count, error } = await worker
      .from("rum_metrics")
      .select("*", { count: "exact", head: true })
      .eq("domain_name", normalizedDomain);

    // If error or count is 0, try with www.
    if (error || count === 0) {
      const withWWW = "www." + normalizedDomain;
      const result = await worker
        .from("rum_metrics")
        .select("*", { count: "exact", head: true })
        .eq("domain_name", withWWW);

      count = result.count;
      error = result.error;
      domain_name = withWWW; // set domain_name to returned domain variant
    } else {
      domain_name = normalizedDomain;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(JSON.stringify({ domain_name, row_count: count }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

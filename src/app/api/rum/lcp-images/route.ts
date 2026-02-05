import { setupDB } from "@/lib/db";
import { error } from "console";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain: string;
  startDate: string;
  endDate: string;
}

export async function POST(request: NextRequest) {
  const body: any = await request.json();
  let { domain, startDate, endDate }: Props = body;

  if (!domain || !startDate || !endDate) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  // Normalize and try domain variants: non-www first, then www
  const strippedDomain = domain.replace(/^www\./i, "");
  const domainVariants = [strippedDomain, `www.${strippedDomain}`];

  let data = null;

  for (const variant of domainVariants) {
    try {
      const result = await worker.rpc("get_lcp_image_metrics", {
        p_domain_name: variant,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (result.error) {
        throw error(result.statusText);
      }

      if (result.data && result.data.length > 0) {
        data = result.data;
        domain = variant; // Use the working domain
        break;
      }
    } catch (error) {
      return NextResponse.json({ message: error }, { status: 500 });
    }
  }

  if (!data) {
    return NextResponse.json(
      {
        error: "No data found for provided domain",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      domain,
      startDate,
      endDate,
      metrics: data,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "max-age=300", // Cache for 5 minutes
      },
    },
  );
}

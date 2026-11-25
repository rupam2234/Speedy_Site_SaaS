import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { authorizeRumDomain } from "@/lib/rum/siteAccess";

const worker = setupDB();

interface Props {
  metric: "LCP" | "INP" | "FCP" | "TTFB" | "CLS";
  domain: string;
  startDate: string;
  endDate: string;
}

export async function POST(req: NextRequest) {
  const { domain, metric, endDate, startDate }: Props = await req.json();

  if(!domain || !metric){
    return NextResponse.json({message: "Bad Request"}, {status: 400})
  }

  const access = await authorizeRumDomain(domain);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, message: access.message },
      { status: access.status },
    );
  }

  const {data, error} = await worker.rpc("cwv_dist_by_connection", {
    p_metric: metric,
    p_domain: access.site.domainName,
    p_start: startDate, 
    p_end: endDate
  })

  if(error){
    return NextResponse.json({message: `${error.message}`}, {status: 500})
  }

  return NextResponse.json({ data }, { status: 200 });
}

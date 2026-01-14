import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  site: string;
  metric: "LCP" | "INP" | "FCP" | "TTFB" | "CLS";
  startDate: string;
  endDate: string;
}

export async function POST(req: NextRequest) {
  const today = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const defaultStartDate = start.toISOString().split("T")[0];
  const defaultEndDate = today.toISOString().split("T")[0];

  const {
    site,
    metric,
    startDate = defaultStartDate,
    endDate = defaultEndDate,
  }: Props = await req.json();

  if (!site || !metric) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const { error, data } = await worker.rpc("rum_distributions_by_metric", {
    p_domain_name: site,
    p_metric_name: metric,
    p_start: startDate,
    p_end: endDate,
  });

  if (error) {
    return NextResponse.json(
      {
        message: `error fetching distribution for ${metric}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 200 });
}

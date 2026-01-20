import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain_name: string;
  metric: string;
  device_type: "desktop" | "mobile" | "tablet";
  result_count?: number;
  start_date: string;
  end_date: string;
}

export async function POST(req: NextRequest) {
  const {
    domain_name,
    metric,
    device_type = "desktop",
    end_date,
    start_date,
    result_count = 15,
  }: Props = await req.json();

  if (!domain_name || !metric) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const { data, error } = await worker.rpc("get_web_vital_counts_by_url", {
    p_domain: domain_name,
    p_metric: metric,
    p_device_type: device_type,
    p_start: start_date,
    p_end: end_date,
    p_limit: result_count,
  });

  if (error) {
    return NextResponse.json({ message: `${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

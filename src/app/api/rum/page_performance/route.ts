import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain: string;
  startDate: string;
  endDate: string;
}

export async function POST(request: NextRequest) {
  const { domain, endDate, startDate }: Props = await request.json();

  if (!domain || !startDate || !endDate) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  try {
    const { data, error } = await worker.rpc("page_performance_analysis", {
      p_domain: domain,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      throw Error(error.message);
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error:any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}

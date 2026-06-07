import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  domain: string;
  startDate: Date;
  endDate: Date;
}

export type CacheHitMiss = {
  agg_time: string;
  domain_name: string;
  origin_hit_count: number;
  origin_hit_percentage: number;
  total_origin_events: number;
};

const worker = setupDB();

export async function POST(req: NextRequest) {
  const today = new Date();
  const thirty_days_back = new Date(today);
  thirty_days_back.setDate(today.getDate() - 30);

  const {
    domain,
    startDate = thirty_days_back,
    endDate = today,
  }: Props = await req.json();

  if (!domain) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  try {
    const { error, data } = await worker
      .from("rum_origin_hits_agg")
      .select("*")
      .eq("domain_name", domain)
      .gte("agg_time", startDate)
      .lte("agg_time", endDate);

    if (error) {
      throw new Error(error.message || "Error fetching origin hits");
    }

    const x = (data as CacheHitMiss[]) || [];

    return NextResponse.json({ x }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "unexpacted error" },
      { status: 500 },
    );
  }
}

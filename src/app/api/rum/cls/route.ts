import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface ReqProps {
  domain: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function POST(request: NextRequest) {
  const today = new Date().toISOString().split("T")[0];

  const past30days = new Date();
  past30days.setDate(past30days.getDate() - 30);

  const {
    domain,
    dateFrom = past30days.toISOString().split("T")[0],
    dateTo = today,
  }: ReqProps = await request.json();

  if (!domain || !dateFrom || !dateTo) {
    return NextResponse.json(
      { message: "Bad request" },
      {
        status: 404,
      },
    );
  }

  try {
    const { data: clsData, error: clsError } = await worker.rpc("rum_cls", {
      p_domain_name: domain,
      p_from: dateFrom,
      p_to: dateTo,
    });

    if (clsError) {
      return NextResponse.json(
        { message: "Error fetching cls data" },
        { status: 500 },
      );
    }

    return NextResponse.json({ clsData }, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 },
    );
  }
}

import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  domain_name: string;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { domain_name }: Props = await req.json();

  if (!domain_name) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  try {
    const { data, error } = await worker.rpc("analyze_lcp_by_device", {
      domain_filter: domain_name,
      days_back: 7,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "unexpacted error" },
      { status: 500 },
    );
  }
}

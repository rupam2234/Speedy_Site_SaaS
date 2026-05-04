import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export type CLSelementData = {
  cls_score: number;
  current_page: string;
  dev_type: string;
  impact_json: Record<string, unknown>;
  involved_elems: Record<string, unknown>;
  l_mode: string;
  most_frequent_element: string;
  occ_count: number;
  rect_json: Record<string, unknown>;
  shift_json: Record<string, unknown>;
  time_avg: number;
};

interface ReqProps {
  domain: string;
}

export async function POST(req: NextRequest) {
  const { domain }: ReqProps = await req.json();

  if (!domain) {
    return NextResponse.json(
      { message: "Bad request" },
      {
        status: 400,
      },
    );
  }

  try {
    const { data, error } = await worker.rpc("cls_elements", {
      p_domain_name: domain,
    });

    if (error) {
      throw new Error(error.message ?? "Error fetching cls elements");
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "server error" },
      { status: 500 },
    );
  }
}

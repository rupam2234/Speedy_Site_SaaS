import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface ReqProps {
  domain: string;
}

export async function POST(req: NextRequest) {
 
  const {domain}: ReqProps = await req.json()

  if (!domain) {
    return NextResponse.json(
      { message: "Bad request" },
      {
        status: 400,
      },
    );
  }

  try {
    const { data, error } = await worker.rpc("rum_cls", {
      p_domain_name: domain,
    });

    if (error) {
      throw new Error(error.message ?? "Error fetching cls elements")
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "server error" },
      { status: 500 },
    );
  }
}

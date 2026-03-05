import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain: string;

}

export async function POST(request: NextRequest) {
  const { domain }: Props = await request.json();

  if (!domain) {
    return NextResponse.json(
      {
        message: "bad request",
      },
      { status: 404 },
    );
  }

  try {
    const { data, error } = await worker.rpc(
      "ttfb_contributors",
      {
        p_domain: domain,
      },
    );

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: 
        error.message ?? "Server error",
      },
      { status: 500 },
    );
  }
}

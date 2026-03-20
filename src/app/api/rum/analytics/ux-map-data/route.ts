import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  domain: string;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { domain }: Props = await req.json();

  if (!domain) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  try {
    const { data, error } = await worker.rpc("ux_map_data", {
      domain_url: domain,
    });

    if (error) throw new Error(error.message ?? "Unable to fetch UX data");

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted Error" },
      { status: 500 },
    );
  }
}

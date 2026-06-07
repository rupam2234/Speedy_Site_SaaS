import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { NetworkServerSchema } from "../..";

export interface ServerNetworkProps {
  domain: string;
  last_created_at?: string | null;
  last_id?: number | null;
  p_limit?: number;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { domain, p_limit, last_created_at, last_id }: ServerNetworkProps =
    await req.json();

  if (!domain || !p_limit) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  try {
    const { data, error } = await worker.rpc("get_network_server_keyset", {
      p_limit: p_limit,
      p_last_created_at: last_created_at !== null ? last_created_at : undefined,
      p_last_id: last_id !== null ? last_id : undefined,
      p_domain_name: domain,
    });

    if (error) {
      throw new Error(error.message ?? "Error fetching network data");
    }

    const x = data as NetworkServerSchema;

    return NextResponse.json({ x }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        message:
          e.message ??
          "Unexpacted error occured in geting network and server data",
      },
      { status: 500 },
    );
  }
}

import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  domain: string;
  secret?: string
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  try {
    const { domain, secret }: Props = await req.json();

    if (!domain) {
      return NextResponse.json(
        { message: "Bad request: domain is required" },
        { status: 400 }
      );
    }

    if(secret){
      // insert the key into db
      const { error } = await worker
        .from("wp_key")
        .upsert({ domain: domain.trim(), wp_secret: secret }, { onConflict: "domain" });

      if (error) {
        return NextResponse.json({ message: "Failed to save WP secret" }, { status: 500 });
      }

      return NextResponse.json({message: "Secret saved"}, {status: 200})
    }

    const { error, data } = await worker
      .from("wp_key")
      .select("wp_secret")
      .eq("domain", domain)
      .single();

    if (error) {
      throw new Error(error.message ?? "Error fetching WP secret");
    }

    if (!data?.wp_secret) {
      return NextResponse.json(
        { message: "No secret found for this site" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, {status: 200});
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
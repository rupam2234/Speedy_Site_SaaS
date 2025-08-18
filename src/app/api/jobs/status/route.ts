import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const supabase = setupDB();

export async function POST(req: NextRequest) {
  try {
    const { domain }: any = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("crux_jobs")
      .select("status")
      .eq("domain", domain)
      .single();

    if (error) {
      return NextResponse.json(
        { status: "error", error: "Database error" },
        { status: 500 }
      );
    }

    if (!data?.status) {
      return NextResponse.json({ status: "pending" }); // fallback
    }

    return NextResponse.json({ status: data.status });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: "Internal server error", err },
      { status: 500 }
    );
  }
}

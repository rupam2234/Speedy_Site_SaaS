import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const supabase = setupDB();

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();

    const { data, error } = await supabase.rpc("user_happiness_dist", {
      domain_filter: body.domain,
      start_date: body.start_date,
      end_date: body.end_date,
    });

    if (error) {
      console.error("Supabase RPC Error:", error);
      return NextResponse.json(
        { message: "Unable to fetch user happiness data" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Happiness data fetched", data },
      { status: 200 }
    );
  } catch (e) {
    console.error("Request Error:", e);
    return NextResponse.json(
      { message: "Invalid request payload" },
      { status: 400 }
    );
  }
}

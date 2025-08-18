import { setupDB } from "@/lib/db";
import { serverClient } from "@/lib/db/server_client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const worker = setupDB();

  const res = NextResponse.next();

  const supabase = serverClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!req) {
    return NextResponse.json(
      {
        message: "Bad request",
      },
      { status: 400 }
    );
  }

  if (!user?.id) {
    return NextResponse.json(
      { message: "Missing user authorization" },
      { status: 401 }
    );
  }

  const body: any = await req.json();

  try {
    const { error, status, data } = await worker
      .from("orders")
      .select("*")
      .eq("website_name", body.domain);

    if (error) {
      return NextResponse.json(
        { message: "Error fetching website data" },
        { status: status }
      );
    }

    return NextResponse.json(
      { message: "Received domain data", data },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error: ", error },
      { status: 500 }
    );
  }
}

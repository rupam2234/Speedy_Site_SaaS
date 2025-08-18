import { setupDB } from "@/lib/db";
import { serverClient } from "@/lib/db/server_client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const worker = setupDB();

  const body: any = await req.json();
  const res = NextResponse.next();

  const supabase = serverClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  if (!req) {
    return NextResponse.json(
      { message: "Bad request: Missing req body" },
      { status: 400 }
    );
  }

  try {
    const { error, status } = await worker
      .from("orders")
      .delete()
      .eq("website_name", body.domain);

    if (error) {
      return NextResponse.json(
        { message: "unable to delete website", status },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "website deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error in deleting website", error },
      { status: 500 }
    );
  }
}

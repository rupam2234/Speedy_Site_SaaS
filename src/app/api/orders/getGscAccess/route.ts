import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  if (!req) {
    return NextResponse.json({ message: "req body missing" }, { status: 400 });
  }

  const body = await req.json();

  if (!body.site) {
    return NextResponse.json({ message: "Missing website!" }, { status: 400 });
  }

  try {
    const { error, data } = await worker
      .from("orders")
      .select("gsc_token")
      .eq("website_name", body.site);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "token received", data },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log to server console for now
    console.log("[Web Vitals Payload]", body);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error parsing Web Vitals payload:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  const body: string = await req.json();

  if (!body) {
    return NextResponse.json({ message: "Missing url!" }, { status: 400 });
  }

  try {
    const { error, data } = await worker
      .from("crux_jobs")
      .select("urls")
      .eq("domain", body);

    if (error) {
      return NextResponse.json(
        { message: "Unable to fetch pages" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "page acquired", data },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error in fetching compiled page data",
        error,
      },
      { status: 500 }
    );
  }
}

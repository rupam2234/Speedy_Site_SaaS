import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  if (!req) {
    return NextResponse.json({ message: "Missing req body!" }, { status: 400 });
  }

  const body: any = await req.json();

  if (body) {
    try {
      const { data, error } = await worker
        .from("pageperf_data")
        .select("")
        .eq("domain", body.domain);

      if (error) {
        return NextResponse.json(
          {
            message: "Error fetching performance data",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: "Data acquired.", data },
        { status: 200 }
      );
    } catch (error) {
      return NextResponse.json(
        { message: "Unexpected error occurred: ", error },
        { status: 500 }
      );
    }
  }
}

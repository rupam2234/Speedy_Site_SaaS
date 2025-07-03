import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body || !Array.isArray(body)) {
    return NextResponse.json(
      { message: "Request body missing or not an array!" },
      { status: 400 }
    );
  }

  try {
    const supabase = setupDB();

    const { data, error } = await supabase
      .from("crux_jobs")
      .insert([{ urls: body, status: "pending" }])
      .select();

    if (error) {
      return NextResponse.json(
        { message: "Error inserting job", error },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "Failed to get inserted job" },
        { status: 500 }
      );
    }

    const jobId = data[0].id;

    return NextResponse.json({ message: "Job queued", jobId }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { message: "Error creating job!", error: err },
      { status: 500 }
    );
  }
}

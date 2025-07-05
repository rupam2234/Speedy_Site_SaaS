import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";

function extractDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body || !Array.isArray(body)) {
    return NextResponse.json(
      { message: "Request body missing or not an array!" },
      { status: 400 }
    );
  }

  const firstUrl = body[0];
  const domain = extractDomain(firstUrl);

  if (!domain) {
    return NextResponse.json(
      { message: "Could not extract domain from first URL" },
      { status: 400 }
    );
  }

  try {
    const supabase = setupDB();

    // Check for existing job with this domain
    const { data: existingJob, error: fetchError } = await supabase
      .from("crux_jobs")
      .select("*")
      .eq("domain", domain)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return NextResponse.json(
        { message: "Failed to check existing job", error: fetchError },
        { status: 500 }
      );
    }

    let jobId: string;

    if (existingJob) {
      // Update the existing row
      const { data: updatedJob, error: updateError } = await supabase
        .from("crux_jobs")
        .update({ urls: body, status: "pending" })
        .eq("domain", domain)
        .select();

      if (updateError || !updatedJob || updatedJob.length === 0) {
        return NextResponse.json(
          { message: "Error updating existing job", error: updateError },
          { status: 500 }
        );
      }

      jobId = updatedJob[0].id;
    } else {
      // Insert a new job
      const { data: insertedJob, error: insertError } = await supabase
        .from("crux_jobs")
        .insert([{ domain, urls: body, status: "pending" }])
        .select();

      if (insertError || !insertedJob || insertedJob.length === 0) {
        return NextResponse.json(
          { message: "Error inserting new job", error: insertError },
          { status: 500 }
        );
      }

      jobId = insertedJob[0].id;
    }

    return NextResponse.json({ message: "Job queued", jobId }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { message: "Error creating or updating job!", error: err },
      { status: 500 }
    );
  }
}

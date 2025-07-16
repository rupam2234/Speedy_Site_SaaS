import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { domain, newUrls } = body;

  if (!domain || !Array.isArray(newUrls)) {
    return NextResponse.json(
      { message: "Missing domain or invalid urls format!" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Fetch current URLs
    const { data, error: fetchError } = await worker
      .from("crux_jobs")
      .select("urls")
      .eq("domain", domain)
      .single();

    if (fetchError || !data) {
      return NextResponse.json(
        { message: "Unable to fetch existing URLs", error: fetchError },
        { status: 500 }
      );
    }

    const existingUrls: string[] = data.urls || [];

    // Step 2: Merge and limit to 10 URLs, prioritizing new ones from the top
    const mergedUrls = Array.from(new Set([...existingUrls, ...newUrls])).slice(
      0,
      10
    );

    const { error: updateError } = await worker
      .from("crux_jobs")
      .update({ urls: mergedUrls })
      .eq("domain", domain);

    if (updateError) {
      return NextResponse.json(
        { message: "Failed to update URLs", error: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "URLs successfully updated", urls: mergedUrls },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { message: "Unexpected error", error: err },
      { status: 500 }
    );
  }
}

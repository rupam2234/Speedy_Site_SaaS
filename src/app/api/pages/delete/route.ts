import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface DeletePageProps {
  domain: string;
  urls: string[];
}

export async function POST(req: NextRequest) {
  const body: DeletePageProps = await req.json();

  if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
    return NextResponse.json({ message: "No pages to delete. Skipping..." });
  }

  try {
    const { data, error: fetchError } = await worker
      .from("crux_jobs")
      .select("urls, results")
      .eq("domain", body.domain)
      .single(); // Expect one row per domain

    if (
      fetchError ||
      !data ||
      !Array.isArray(data.urls) ||
      !Array.isArray(data.results)
    ) {
      return NextResponse.json(
        { message: "Error acquiring data or invalid structure." },
        { status: 500 }
      );
    }

    const { urls: existingUrls, results: existingResults } = data;

    // Flatten the nested results array if necessary
    const flatResults = existingResults.flat();

    // Filter results where page_address is NOT in the body.urls
    const filteredResults = flatResults.filter(
      (result: any) => !body.urls.includes(result.page_address)
    );

    // Filter urls
    const filteredUrls = existingUrls.filter(
      (url: string) => !body.urls.includes(url)
    );

    // Update the DB
    const { error: updateError } = await worker
      .from("crux_jobs")
      .update({
        urls: filteredUrls,
        results: [filteredResults], // wrap in array to match original shape [[]]
      })
      .eq("domain", body.domain);

    if (updateError) {
      return NextResponse.json(
        { message: "Error updating database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Pages deleted successfully." });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }
}

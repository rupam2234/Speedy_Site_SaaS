import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface RequestBody {
  domain: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domain } = body as RequestBody;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { message: "Domain is required and must be a string" },
        { status: 400 }
      );
    }

    const { data: urls, error } = await worker
      .from("page_monitoring")
      .select("*")
      .eq("website", domain);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return NextResponse.json(
      { data: urls.flatMap((data) => data.url) ?? [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/pages:", error);
    return NextResponse.json(
      { message: "Internal server error", data: [] },
      { status: 500 }
    );
  }
}

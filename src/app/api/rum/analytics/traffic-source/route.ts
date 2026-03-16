import { NextRequest, NextResponse } from "next/server";

interface Props {
  range: string; 
  domain: string;
  key: string 
}

export async function POST(req: NextRequest) {
  try {
    const { range, domain, key }: Props = await req.json();

    if (!range || !domain || !key) {
      return NextResponse.json(
        { message: "Missing request body" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://traffic-source-cron.thespeedysite.workers.dev/get-source?range=${encodeURIComponent(
        range
      )}&domain=${encodeURIComponent(domain)}&key=${encodeURIComponent(key)}`
    );

    if (!response.ok) {
     throw new Error(response.statusText ?? "Error fetching traffic source")
    }

    const data = await response.json();

    return NextResponse.json({data}, {status: 200});
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { FaviconData } from "../fetch_batch/route";
import { checkFavicon } from "@/components/utils";

export async function POST(req: Request) {
  try {
    const { website }: { website: string } = await req.json();
    if (!website) {
      return NextResponse.json(
        { message: "No valid website data provided" },
        { status: 400 }
      );
    }

    const siteUrl = `https://${website.replace(/(^\w+:|^)\/\//, "")}`;
    const favicon = await checkFavicon(siteUrl);

    const faviconData: FaviconData = { site: siteUrl, favicon };

    return NextResponse.json({ faviconData: faviconData });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

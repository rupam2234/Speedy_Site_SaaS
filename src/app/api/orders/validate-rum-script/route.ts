import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    domain: string;
}

const worker = setupDB()

export async function POST(req: NextRequest) {
  try {
    const { domain }: Props = await req.json();

    // 1. Normalize the URL
    const url = domain.startsWith("http") ? domain : `https://${domain}`;

    // 2. Apply Cache Bypass: Add a unique timestamp as a query parameter
    // This forces WP Rocket/Cloudflare to bypass their page cache.
    const separator = url.includes("?") ? "&" : "?";
    const cacheBusterUrl = `${url}${separator}nocache=${Date.now()}`;

    const response = await fetch(cacheBusterUrl, {
      // 3. Add Cache-Control headers for the request
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
    });

    if(!response.ok){
      throw new Error(`Target site returned ${response.status}: ${response.statusText}`);
    }

    const html = await response.text(); 

    // 4. Improved Regex:
    // Handles double quotes, single quotes, and potential minification/lazy-loading attributes
    // like data-src (used by WP Rocket) or data-rocket-src.
    const scriptRegex = /<(script|link)[^>]+(?:src|data-src|data-rocket-src)=["']https:\/\/rum\.speedy\.site\/rum\.js(?:\?[^"']*)?["'][^>]*>/i;
    const scriptExists = scriptRegex.test(html);

    // Update database
    const { error } = await worker
      .from("orders")
      .update({ rum_connection: scriptExists })
      .eq("website_name", domain);

    if(error){
      throw new Error(error.message);
    }

    return NextResponse.json({ scriptExists, validatedUrl: cacheBusterUrl }, { status: 200 });

  } catch (error: any) {
    console.error("Validation Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  } 
}
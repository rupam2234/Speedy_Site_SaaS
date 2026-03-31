import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

interface Props {
  url: string;
}

async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per attempt

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": userAgents[i % userAgents.length],
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          Referer: new URL(url).origin,
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        clearTimeout(timeoutId);
        return response;
      }
    } catch (err) {
      if (i === retries) throw err;
      console.log(`Retry ${i + 1} for ${url}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw new Error("All retries failed");
}

export async function POST(req: NextRequest) {
  const { url }: Props = await req.json();

  if (!url) return NextResponse.json({ message: "No URL" }, { status: 400 });

  try {
    const response = await fetchWithRetry(url);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error ?? "Target server is too slow or blocking requests" },
      { status: 504 },
    );
  }
}

import { AnalysisType } from "@/app/(dashboard)/dashboard/rum/web-vitals/helpers/lcp";
import { NextRequest, NextResponse } from "next/server";

export async function POST<T>(req: NextRequest) {
  const { metric, data }: AnalysisType<T> = await req.json();

  if (!metric || !data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `
      Task:
      Act as a Web Performance Expert specializing in Core Web Vitals optimization.
      Analyze ${metric} contributor data and generate precise, actionable fixes.

      Data:
      ${JSON.stringify(data)}

      Analysis Rules:

      1. Identify the PRIMARY bottleneck using this priority:
      - TTFB
      - Render Delay
      - Load Delay
      - Load Duration

      2. Only analyze metrics exceeding these thresholds:
      - TTFB → exceeds 800ms AND exceeds page average TTFB
      - Render Delay → exceeds 200ms
      - Load Delay → exceeds 250ms
      - Load Duration → exceeds 1000ms

      3. Determine the dominant performance issue:
      - TTFB → slow backend response, uncached HTML/API requests
      - Render Delay → render-blocking JavaScript or CSS
      - Load Delay → delayed resource discovery or low fetch priority
      - Load Duration → oversized or inefficient assets

      4. Identify likely root causes ONLY when supported by Data:
      - uncached API responses
      - missing CDN/edge caching
      - slow database/backend processing
      - render-blocking scripts
      - non-critical CSS blocking paint
      - missing preload/fetchpriority
      - lazy-loaded LCP assets
      - oversized images
      - uncompressed assets
      - inefficient image formats
      - third-party resource blocking

      5. Prioritize fixes by:
      - highest contributor impact
      - user-visible loading impact
      - likelihood of improvement

      Fix Mapping Rules:

      - High TTFB →
        suggest edge caching, backend optimization, API caching, database optimization

      - High Render Delay →
        suggest deferring JavaScript, reducing render-blocking resources, inlining critical CSS

      - High Load Delay →
        suggest preload, preconnect, fetchpriority, earlier resource discovery

      - High Load Duration →
        suggest compression, resizing, modern formats like WebP/AVIF

      Strict Fix Requirements:

      Every item MUST include:
      1. Exact asset filename, script, image, or path from Data
      2. Root cause
      3. Concrete developer-friendly action

      Avoid generic advice like:
      - "optimize performance"
      - "improve loading"
      - "reduce JavaScript"

      Combine cause + fix into one sentence.

      Good Examples:
      - "Implement edge caching for /api/v1/products because uncached responses delay initial HTML delivery"
      - "Preload hero-banner.webp using fetchpriority='high' because late discovery delays rendering"
      - "Convert gallery-image.png to AVIF because oversized images extend download completion"

      Platform Rules:

      - Do not assume Cloudflare usage
      - Suggest CDN/edge caching generically unless provider is explicitly present
      - Suggestions should target developers and site owners
      - Avoid framework-specific advice unless clearly supported by Data

      Confidence Rules:

      - Only infer causes strongly supported by Data
      - If evidence is weak, use:
        - "likely caused by"
        - "possibly triggered by"
      - Never invent assets, scripts, or endpoints absent from Data

      Output Format:

      - Return ONLY bullet points
      - No JSON
      - No markdown code blocks
      - No explanations outside bullets
      - Each bullet MUST start with "•"
      - Max 3 bullets
      - Max 20 words each
      - Never mention:
        - milliseconds
        - timing values
        - latency numbers
      - Focus only on causes and fixes
      - Each bullet MUST contain:
        - exact asset/script/path from Data
        - root cause
        - actionable fix

      Constraints:

      - No repetition
      - No generic advice
      - Must reflect actual Data fields
      - Asset-specific recommendations only
      `;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPEN_ROUTER_KEY}`,
      },
      body: JSON.stringify({
        stream: true,
        model: "openai/gpt-oss-120b:free",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error ?? "Error getting analysis");
    }

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted Error" },
      { status: 500 },
    );
  }
}

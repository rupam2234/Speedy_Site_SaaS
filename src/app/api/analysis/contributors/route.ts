import { AnalysisType } from "@/app/(dashboard)/dashboard/rum/web-vitals/helpers/lcp";
import { NextRequest, NextResponse } from "next/server";

export async function POST<T>(req: NextRequest) {
  const { metric, data }: AnalysisType<T> = await req.json();

  if (!metric || !data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `
    Task: Act as a Web Performance Expert. Analyze ${metric} contributor data and provide actionable fixes.

    Data: ${JSON.stringify(data)}

    Rules of Analysis:
    1. Identify the primary bottleneck using this priority: TTFB > Render Delay > Load Delay > Load Duration.
    2. Only suggest a fix if the metric exceeds the "Good" threshold:
      - TTFB: >800ms (Must also exceed page average TTFB)
      - Render Delay: >200ms
      - Load Delay: >250ms
      - Load Duration: >1000ms

    Required Fix Mapping:
    - If TTFB: Suggest Edge Caching or API optimization. (e.g., Use Cloudflare workers for /api/v1)
    - If Render Delay: Suggest deferring JS or inlining critical CSS. (e.g., Move non-critical script.js to footer)
    - If Load Delay: Suggest Preload/Fetchpriority headers. (e.g., Add rel="preload" for hero-image.jpg)
    - If Load Duration: Suggest compression or resizing. (e.g., Convert product.png to WebP/AVIF)

    Output Format:
    - Return ONLY JSON: {"fixes": string[]}
    - Max 3 items. Max 20 words per item.
    - Start every item with an action verb (e.g., "Implement", "Reduce", "Optimize").
    - Include a specific asset filename or path from the Data in the example.
    - Avoid using full URLs
    - The suggestions should be for site owners & developers
    - Keep in mind not all user uses Cloudflare

    Example Output:
    {
      "fixes": [
        "Preload the LCP image (e.g., add fetchpriority='high' to banner-hero.webp)",
        "Reduce render-blocking JS (e.g., defer analytics.js until after window load)"
      ]
    }

    Constraints:
    - No generic advice. 
    - Asset-specific based on the provided Data.
    - No markdown formatting.
    `;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPEN_ROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data: any = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message ?? "Error getting analysis");
    }

    const raw = data.choices[0].message.content;

    const cleanedRow = cleanLLMJson(raw);

    const json = JSON.parse(cleanedRow);

    return NextResponse.json({ json }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted Error" },
      { status: 500 },
    );
  }
}

function cleanLLMJson(text: string) {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = codeBlock ? codeBlock[1] : text;

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");

  if (first === -1 || last === -1) {
    throw new Error("Invalid JSON response");
  }

  return raw.slice(first, last + 1).trim();
}

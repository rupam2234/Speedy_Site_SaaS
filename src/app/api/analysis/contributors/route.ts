import { AnalysisType } from "@/app/(dashboard)/dashboard/rum/web-vitals/helpers/lcp";
import { NextRequest, NextResponse } from "next/server";

export async function POST<T>(req: NextRequest) {
  const { metric, data }: AnalysisType<T> = await req.json();

  if (!metric || !data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `You are a web performance expert.

      Task:
      Analyze ${metric} contributor data using STRICT timing hierarchy.
      
      Priority Order:
      1. TTFB
      2. Load Delay
      3. Load Duration
      4. Render Delay
      
      Rules:
      - Always evaluate higher priority metrics first
      - Prioritize higher metrics, but if no actionable fix is allowed, evaluate the next metric
      
      Thresholds:
      TTFB: good <800ms, poor >1800ms
      Load Delay: good <250ms, poor >1000ms
      Load Duration: good <1000ms, poor >2500ms
      Render Delay: good <200ms, poor >800ms
      
      TTFB Logic:
      - Do NOT suggest direct fixes
      - If TTFB is high, return a diagnostic insight
      - Compare with asset-average TTFB
      - Suggest high-level action ONLY if both are poor
      
      Output:
      Return ONLY JSON:
      {"fixes": string[]}
      
      Output Rules:
      - Always return at least 1 item
      - Max 3 items
      - Each item <= 20 words
      - Items can be fixes OR diagnostic insights
      - Do not return input structure or hints such as top_3_render_blockers
      
      Constraints:
      - Asset-specific only
      - No generic advice
      - No markdown or extra text
      
      Data:
      ${JSON.stringify(data)}
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

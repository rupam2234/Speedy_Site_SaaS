import { NextRequest, NextResponse } from "next/server";

export type clsAnalysisType<T> = {
  metric: "CLS";
  data: T;
};

export async function POST<T>(req: NextRequest) {
  const { metric, data }: clsAnalysisType<T> = await req.json();

  if (!metric || !data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `
  Task: Act as a Web Performance Expert. Analyze CLS (Cumulative Layout Shift) contributor data and provide precise, root-cause fixes.
  
  Data: ${JSON.stringify(data)}
  
  Rules of Analysis:
  1. Identify the PRIMARY unstable element using:
     - most_frequent_element
     - largest shift (impact_json.distanceMoved or shift_json.dy)
  2. Determine WHY the shift happens (not just WHAT shifted):
     - late-loading asset
     - DOM injection
     - font swap
     - missing reserved space
     - CSS/layout recalculation
  3. Don't use involved_elems to prepare your suggestions.
  4. If cls_score <= 0.1, still return micro-optimizations (never return empty).
  
  Strict Fix Requirements:
  - Every fix MUST include:
    1. The exact element/asset from Data
    2. The root cause (e.g., late injection, missing dimensions, reflow trigger)
    3. A concrete developer action
  
  - Avoid generic fixes like only "add width/height"
  - Combine cause + fix (e.g., "Prevent layout shift from late-loaded hero.jpg by preloading and defining aspect-ratio")
  
  Fix Mapping Logic:
  - Images shifting due to late load → preload + aspect-ratio
  - Repeated shifts (high occ_count) → stabilize container or prevent re-render
  - Vertical shifts (high dy) → reserve space or prevent DOM push
  - Fonts → font-display swap + preload font file
  - Dynamic components → skeleton/placeholder + fixed container size
  - CSS/layout thrash → move critical styles earlier, avoid JS-driven layout changes
  
  Output Format:
  - Return ONLY JSON: {"fixes": string[]}
  - ALWAYS return at least 1 fix (never empty)
  - Max 3 items. Max 20 words each.
  - Start with an action verb
  - Include actual element/asset name from Data
  - No full URLs
  
  Example Output:
  {
    "fixes": [
      "Prevent shift from hero-banner.jpg by preloading and setting aspect-ratio before render",
      "Stabilize product-card div by adding fixed height placeholder to stop repeated reflows"
    ]
  }
  
  Constraints:
  - No generic advice
  - No repetition
  - Must reflect actual Data signals (occ_count, shift distance, elements)
  - No markdown formatting
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
        // stream: true,
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

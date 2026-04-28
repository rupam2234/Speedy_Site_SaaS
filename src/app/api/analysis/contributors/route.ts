import { AnalysisType } from "@/app/(dashboard)/dashboard/rum/web-vitals/helpers/lcp";
import { NextRequest, NextResponse } from "next/server";

export async function POST<T>(req: NextRequest) {
  const { metric, data }: AnalysisType<T> = await req.json();

  if (!metric || !data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `You are a web performance expert.
                  Analyze the following ${metric} contributor data.

                  Give:
                    1. Fixes (max 3), wordpress and non wordpress suggestion in a user friendly manner.

                    Rules:

                      - Check if metric is already under good range
                      - Keep each point under 20 words
                      - Rely heavily on the asset timings i.e TTFB, Load Delay, Load Duration and Render Delay to make your judgements
                      - Provide asset-specific, actionable recommendations only
                      - Focus on measurable performance improvements aligned with industry standards
                      - Avoid suggestions that are not supported by the provided data
                      - Ensure consistency: repeat the same recommendation for similar inputs
                      - For TTFB or LCP TTFB:
                         > Do not suggest fixes directly
                         > State if TTFB is high
                         > Compare against asset-average TTFB
                         > Recommend action only if both exceed healthy thresholds
                      - Respect asset type strictly; do not mix guidance across different asset categories
                      - Avoid conflicting or misleading suggestions (e.g., never recommend lazy loading for LCP images)
                      - Ensure recommendations match actual asset size (e.g., do not suggest 150KB optimization for a 20KB asset)

                  Return ONLY in pure JSON:

                  {
                    "fixes": string[]
                  }

                  Do NOT include:
                  - markdown
                  - code fences (\`\`\` or \`\`\`json)
                  - explanations
                  - extra text before or after


                  Data:
                  ${JSON.stringify(data, null, 2)}
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

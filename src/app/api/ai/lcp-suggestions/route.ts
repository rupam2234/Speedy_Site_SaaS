import { NextRequest, NextResponse } from "next/server";
import { ModelMessage, streamText } from "ai";
import { LcpImageMetric } from "@/app/(dashboard)/dashboard/rum/lcp-images/page";

// Add retry logic here (same as in your CLI script)
async function fetchSuggestions(
  messages: ModelMessage[],
  retries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = streamText({
        model: "openai/gpt-oss-120b",
        messages,
      });

      let fullResponse = "";
      for await (const delta of result.textStream) {
        fullResponse += delta;
      }

      return fullResponse;
    } catch (error: any) {
      if (attempt === retries) throw error;
      await new Promise((res) => setTimeout(res, 500 * attempt));
    }
  }
  throw new Error("Retries exhausted");
}

export async function POST(req: NextRequest) {
  const api_key = process.env.AI_GATEWAY_API_KEY;
  if (!api_key) {
    return NextResponse.json({ error: "Missing API key" }, { status: 400 });
  }

  const body = await req.json();
  const metric: LcpImageMetric = body.metric;

  if (!metric || !metric.image_url) {
    return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  }

  const prompt = `
You are a web performance expert specializing in optimizing Largest Contentful Paint (LCP) images that are always above the fold and are among the main contributors to LCP on a webpage.

Given this image data:
- URL: ${metric.image_url}
- Displayed size: ${metric.avg_width} × ${metric.avg_height} px
- Average LCP: ${metric.avg_lcp_ms} ms (current performance)
- Time to First Byte (TTFB): ${metric.avg_time_to_first_byte} ms
- Resource load delay: ${metric.avg_resource_load_delay} ms
- Render delay: ${metric.avg_element_render_delay} ms
- Lazy-loaded: ${metric.pct_lazy === 0 ? "No" : "Yes"}
- Transfer size: ${((metric.avg_transfer_size ?? 0) / 1024).toFixed(1)} KB
- Decoded size: ${((metric.avg_decoded_body_size ?? 0) / 1024).toFixed(1)} KB
- Device type: ${metric.device_type}

Assess the image's LCP quality as follows:
- Good: LCP under 2500 ms
- Average: LCP between 2500 ms and 4000 ms
- Poor: LCP above 4000 ms

Based on this assessment and the above metrics, provide **7 or more targeted, clear, and actionable suggestions** to improve the LCP of this specific image. Each suggestion must:

- Be tailored based on actual metric values (e.g., if transfer size is high, address that specifically).
- Explain briefly **why** this change helps (reference the relevant metric).
- Include **at least one real-world tool, plugin, or library** developers can use to implement it (e.g., “use ImageOptim”, “try the 'Preload Featured Images' plugin for WordPress”).
- Optionally include a **short usage example**, inline code snippet (1 line), or tool link if helpful.

Avoid vague or generic advice like “optimize the image” or “use caching.” Instead, give **developer-friendly**, **practical**, and **metric-aware** solutions that show **how** to fix the issue.

Respond in **valid JSON only**, no Markdown, no extra commentary, using this format:

{
  "title": "Targeted LCP Optimization Suggestions",
  "tips": [
    {
      "recommendation": "Short title of the fix",
      "why": "1–2 sentence explanation referencing metrics",
      "tools": "Specific tools, plugins, or libraries to apply this fix (include short usage example if possible)"
    },
    ...
  ]
}
`;

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const suggestionsRaw = await fetchSuggestions(messages);

    // Remove any markdown code block wrappers like ```json ... ```
    const cleaned = suggestionsRaw.replace(/```json|```/g, "").trim();

    // Parse to JSON
    const suggestions = JSON.parse(cleaned);

    // Return JSON response
    return NextResponse.json(suggestions);
  } catch (error) {
    // If parsing fails or fetchSuggestions throws, return error JSON with status 500
    return NextResponse.json(
      { error: "Failed to parse AI suggestions: " + (error as Error).message },
      { status: 500 }
    );
  }
}

import { LcpImageMetric } from "@/app/(dashboard)/dashboard/rum/lcp-images";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  metric: LcpImageMetric;
}

type Message = {
  role: string;
  content: string;
}

/**
 * Fetch AI suggestions with retry logic
 */
async function fetchSuggestions(
  messages: Message[],
  retries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": `${process.env.Gemeni_API_key}`,
          },
          body: JSON.stringify({
            contents: messages.map((m) => ({
              role: m.role,
              parts: [{ text: m.content }],
            })),
          }),
        }
      );

      const body: any = await res.json();

      if (!res.ok) {
        console.log(body.error?.message);
        throw new Error(body.error?.message || "Gemini API error");
      }

      // Gemini response format
      const fullResponse =
        body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      return fullResponse;
    } catch (error: any) {
      console.error("AI request failed:", error);
      if (attempt === retries) throw error;
      await new Promise((res) => setTimeout(res, 500 * attempt));
    }
  }
  throw new Error("Retries exhausted in fetchSuggestions");
}


export async function POST(req: NextRequest) {
  try {
    const {metric}: Props = await req.json();

    if (!metric || !metric.image_url) {
      throw new Error("Invalid metric provided");
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

        Based on this assessment and the above metrics, provide 7 or more targeted, clear, and actionable suggestions to improve the LCP of this specific image. Each suggestion must:
        - Be tailored based on actual metric values
        - Explain briefly why this change helps (reference the relevant metric)
        - Include at least one real-world tool, plugin, or library developers can use to implement it
        - Optionally include a short usage example

        Respond in valid JSON only, no Markdown, no extra commentary, using this format:
        {
          "title": "Targeted LCP Optimization Suggestions",
          "tips": [
            {
              "recommendation": "Short title of the fix",
              "why": "1–2 sentence explanation referencing metrics",
              "tools": "Specific tools, plugins, or libraries to apply this fix",
            }
          ]
        }

        important: keep it short but clear
        `;

    const messages: Message[] = [{ role: "user", content: prompt }];

    const suggestionsRaw = await fetchSuggestions(messages);

    // Clean possible Markdown code blocks
    const cleaned = suggestionsRaw.replace(/```(?:json)?/g, "").trim();

    let suggestions;
    try {
      suggestions = JSON.parse(cleaned);
    } catch (parseError) {
      // console.error("Failed to parse AI JSON:", cleaned);
      throw new Error("AI response could not be parsed as JSON");
    }

    return NextResponse.json(suggestions);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
}

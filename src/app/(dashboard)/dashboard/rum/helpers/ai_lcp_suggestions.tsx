import { ModelMessage, streamText } from "ai";
import * as readline from "node:readline/promises";
import { LcpImageMetric } from "../lcp-images/page";
import fs from "node:fs/promises";

// === CONFIG ===
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const OUTPUT_FILE = "public/lcp-suggestions.json";
const MODEL_ID = "openai/gpt-oss-120b";

// === METRIC SAMPLE ===
const metrics: LcpImageMetric = {
  period: "Last 30 Days",
  domain_name: "www.oldhousetonewhome.net",
  device_type: "Desktop",
  image_url:
    "https://www.oldhousetonewhome.net/wp-content/uploads/2017/07/cropped-cropped-cropped-MAIN-LOGO2-e1672975820940.png",
  occurrence_count: 501,
  avg_lcp_ms: 2632.9,
  min_lcp_ms: 396,
  max_lcp_ms: 15376,
  p75_lcp_ms: 2956,
  pct_exceeding_cwv: 51.9,
  avg_decoded_body_size: null,
  avg_element_render_delay: 498.79,
  avg_height: null,
  avg_resource_load_delay: 382.86,
  avg_resource_load_duration: 132.02,
  avg_time_to_first_byte: 1619.23,
  avg_transfer_size: null,
  avg_width: null,
  pct_lazy: 0,
};

// === MAIN FUNCTION ===
export default async function AI_LCP_suggestions() {
  const api_key = process.env.AI_GATEWAY_API_KEY;

  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (!api_key) {
    console.error("Error: Missing AI_GATEWAY_API_KEY");
    terminal.close();
    return;
  }

  const prompt = `Given an image with URL ${metrics.image_url}, avg LCP ${metrics.avg_lcp_ms}ms, TTFB ${metrics.avg_time_to_first_byte}ms, resource load delay ${metrics.avg_resource_load_delay}ms, render delay ${metrics.avg_element_render_delay}ms, and no lazy-loading, suggest 3-5 concise ways to improve LCP.`;

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    console.log("🔍 Fetching LCP improvement suggestions...\n");

    const suggestions = await fetchWithRetry(messages);

    await fs.writeFile(
      OUTPUT_FILE,
      JSON.stringify(
        {
          image_url: metrics.image_url,
          suggestions: suggestions.trim(),
        },
        null,
        2
      )
    );

    console.log(`\nSuggestions saved to ${OUTPUT_FILE}`);
  } catch (error: any) {
    console.error(`\nFinal error: ${error.message}`);
  } finally {
    terminal.close();
  }
}

// === RETRY FUNCTION ===
async function fetchWithRetry(
  messages: ModelMessage[],
  retries = MAX_RETRIES,
  delayMs = RETRY_DELAY_MS
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = streamText({
        model: MODEL_ID,
        messages,
      });

      let fullResponse = "";
      for await (const delta of result.textStream) {
        fullResponse += delta;
        process.stdout.write(delta);
      }

      return fullResponse;
    } catch (error: any) {
      console.error(`\n⚠️ Attempt ${attempt} failed: ${error.message}`);

      if (attempt === retries) {
        throw new Error("All retries failed.");
      }

      const backoff = delayMs * Math.pow(2, attempt - 1) + Math.random() * 300;
      console.log(`⏳ Retrying in ${Math.round(backoff)}ms...\n`);
      await new Promise((res) => setTimeout(res, backoff));
    }
  }

  throw new Error("Retry logic failed unexpectedly.");
}

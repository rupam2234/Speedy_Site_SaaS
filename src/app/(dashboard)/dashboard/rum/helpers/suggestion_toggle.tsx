"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { LcpImageMetric } from "../lcp-images/page";

type AiTip = {
  recommendation: string;
  why: string;
};

type AiSuggestions = {
  title: string;
  tips: AiTip[];
};

export default function SuggestionsToggle({
  selectedImage,
  showHardcoded,
}: {
  selectedImage: LcpImageMetric | null;
  showHardcoded: boolean;
}) {
  const [open, setOpen] = useState<"ai" | "manual" | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  function renderSuggestions(data: AiSuggestions) {
    const { tips } = data;

    const filteredTips = tips.filter((tip) => {
      const lower =
        tip.recommendation?.toLowerCase() + " " + tip.why?.toLowerCase();
      const unwantedPhrases = [
        "awkward phrase",
        "unwanted text",
        "some other phrase",
      ];
      return !unwantedPhrases.some((phrase) => lower.includes(phrase));
    });

    return (
      <div>
        {/* <h3 className="text-base font-semibold mb-2">{title}</h3> */}
        <ul className="space-y-2">
          {filteredTips.map((tip, idx) => (
            <li key={idx}>
              <strong>{tip.recommendation}:</strong> {tip.why}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  async function fetchSuggestions(image: LcpImageMetric) {
    setLoading(true);
    setAiSuggestions(null);
    setOpen("ai");
    try {
      const res = await fetch("/api/ai/lcp-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: image }),
      });

      const data: any = await res.json();

      if (res.ok && data?.title && Array.isArray(data?.tips)) {
        setAiSuggestions(data);
      } else {
        setAiSuggestions(null);
        console.error("Invalid AI response structure", data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 mt-6 max-w-xl mx-auto font-sans">
      {/* Manual Suggestions Toggle */}
      {showHardcoded && (
        <div>
          <button
            onClick={() => setOpen(open === "manual" ? null : "manual")}
            className="flex items-center justify-between w-full text-left text-primary text-sm font-medium hover:underline transition"
            aria-expanded={open === "manual"}
            aria-controls="manual-suggestions"
          >
            <span>Generic Optimization Tips</span>
            <ChevronDown
              className={clsx(
                "w-5 h-5 transition-transform duration-300",
                open === "manual" && "rotate-180"
              )}
            />
          </button>

          {open === "manual" && (
            <div
              id="manual-suggestions"
              className="mt-3 text-primary/80 text-sm leading-relaxed space-y-2 pl-1"
            >
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  Convert images to <strong>WebP</strong> or{" "}
                  <strong>AVIF</strong>
                </li>
                <li>
                  Use <strong>lazy loading</strong> for offscreen images
                </li>
                <li>
                  Resize images properly (avoid large images in small
                  containers)
                </li>
                <li>
                  Use a CDN like <strong>Cloudflare</strong> or{" "}
                  <strong>ImageKit</strong>
                </li>
                <li>
                  Try plugins: <strong>ShortPixel, Optimole, or Smush</strong>{" "}
                  (for WordPress)
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* AI Suggestions */}
      <div>
        <button
          disabled={!selectedImage || loading}
          onClick={() => {
            if (selectedImage) fetchSuggestions(selectedImage);
          }}
          className={clsx(
            "w-full text-primary-foreground py-2 rounded-md text-sm font-semibold transition bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading
            ? "Generating suggestions..."
            : "Ask LCP Sense for Tips (Beta)"}
        </button>

        {open === "ai" && (
          <div className="mt-4 text-primary/80 dark:text-primary/85 text-sm leading-relaxed min-h-[4rem]">
            {!loading && aiSuggestions && renderSuggestions(aiSuggestions)}
          </div>
        )}
      </div>
    </div>
  );
}

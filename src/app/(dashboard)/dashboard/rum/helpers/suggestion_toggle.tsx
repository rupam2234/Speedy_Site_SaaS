"use client";

import { useState } from "react";
import clsx from "clsx";
import { LcpImageMetric } from "../lcp-images/page";
import { toast } from "sonner";

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
}: {
  selectedImage: LcpImageMetric | null;
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
        toast.error("Unable to generate tips at the moment. Please try again");
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
          {loading ? "Analyzing..." : "Ask AI for Tips"}
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

"use client";

import { useEffect, useRef, useState } from "react";
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

type ImageType = "jpg" | "jpeg" | "png";

export default function SuggestionsToggle({
  selectedImage,
}: {
  selectedImage: LcpImageMetric | null;
}) {
  const [open, setOpen] = useState<"ai" | "manual" | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [estSaving, setEstSaving] = useState<{
    newSize: number;
    saving: number;
  }>();

  const imageRef = useRef<string | null>(null);

  const reductions: Record<ImageType, number> = {
    jpg: 0.25,
    png: 0.3,
    jpeg: 0.25,
  }; // common baseline for image compression thresholds per image type

  useEffect(() => {
    if (imageRef.current !== selectedImage?.image_url) {
      setAiSuggestions(null);
    }

    imageRef.current = selectedImage?.image_url
      ? selectedImage.image_url
      : null;

    // also get estimatedSaving
    setEstSaving(estimatedSaving(selectedImage ? selectedImage : null));
  }, [selectedImage]); // ()-> hides previous AI suggestion when user selects another image

  return (
    <>
      {estSaving?.newSize === 0 && estSaving.saving === 0 ? (
        <>{/* display nothing*/}</>
      ) : (
        <div className="mb-10 space-y-3 items-start text-sm text-primary/80 dark:text-primary/85">
          {estSaving && selectedImage && (
            <div className="space-y-2">
              <h3 className="font-semibold">Compression preview:</h3>

              <div className="relative w-full bg-primary/10 rounded-2xl h-4 overflow-hidden">
                {/* New image size (green) */}
                <div
                  className="absolute left-0 top-0 h-full rounded-2xl bg-[#00c950]/70 transition-all duration-300"
                  style={{
                    width: selectedImage.avg_transfer_size
                      ? `${(estSaving.newSize / selectedImage.avg_transfer_size) * 100}%`
                      : "0%",
                  }}
                />
              </div>

              {/* Labels */}
              <div className="flex justify-between text-xs text-primary/70 select-none">
                <span className="cursor-help flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#00c950]/70" />
                  Compressed
                  <span className="text-primary/50">
                    ({(estSaving.newSize / 1000).toFixed(2)} KB)
                  </span>
                </span>

                <span className="cursor-help flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/20" />
                  Potential savings
                  <span className="text-primary/50">
                    ({(estSaving.saving / 1000).toFixed(2)} KB)
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        disabled={!selectedImage || loading}
        onClick={() => {
          if (selectedImage) fetchSuggestions(selectedImage);
        }}
        className={clsx(
          "w-full cursor-pointer bg-primary/80 hover:bg-primary/60 text-primary-foreground py-2 rounded-md text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        {loading ? (
          <span className="flex gap-3 justify-center items-center">
            Thinking{" "}
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.2s]" />
              <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.1s]" />
              <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" />
            </div>
          </span>
        ) : (
          "Ask AI how to optimize this image"
        )}
      </button>

      {open === "ai" && (
        <div className="mt-4 text-primary/80 dark:text-primary/85 text-sm leading-relaxed min-h-[4rem]">
          {!loading && aiSuggestions && renderSuggestions(aiSuggestions)}
        </div>
      )}
    </>
  );

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

  function estimatedSaving(image: LcpImageMetric | null): {
    newSize: number;
    saving: number;
  } {
    if (image === null) {
      return { newSize: 0, saving: 0 };
    }

    const url = image.image_url.split("?")[0]; // remove query string
    const parts = url.split(".");
    const imageType = parts[parts.length - 1].toLowerCase();

    if (!["jpg", "jpeg", "png"].includes(imageType)) {
      return { newSize: 0, saving: 0 };
    }

    const currentSize = image.avg_transfer_size ? image.avg_transfer_size : 0;

    const reductionPercent = reductions[imageType as ImageType] || 20; // deafult compression ratio is 20%

    const savedBytes = Math.round(currentSize * reductionPercent);

    const newSize = currentSize - savedBytes;

    return { newSize: newSize, saving: savedBytes };
  }
}

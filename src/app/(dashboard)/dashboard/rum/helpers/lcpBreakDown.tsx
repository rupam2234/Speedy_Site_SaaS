"use client";

import React, { useState, useMemo, ReactNode } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";
import Image from "next/image";

interface LCPElementData {
  element_target: string;
  avg_lcp_value: number;
  avg_resource_load_delay: number;
  avg_resource_load_duration: number;
  avg_element_render_delay: number;
  occurrence_count: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  device_type: string;
  page_url: string;
  image_url: string;
}

interface Props {
  data: LCPElementData[];
}

const loading = true;
const color = "green";

const SORT_OPTIONS = [
  { label: "LCP", value: "avg_lcp_value" },
  { label: "Load Delay", value: "avg_resource_load_delay" },
  { label: "Duration", value: "avg_resource_load_duration" },
  { label: "Render Delay", value: "avg_element_render_delay" },
];

export const getSuggestions = (
  elementTarget: string,
  totalLCP: number,
  resourceLoadDelay: number,
  resourceLoadDuration: number,
  elementRenderDelay: number
): ReactNode[] => {
  const lower = elementTarget?.toLowerCase();
  const suggestions: ReactNode[] = [];

  const loadSum = resourceLoadDelay + resourceLoadDuration + elementRenderDelay;

  const isImage =
    lower.includes("img") ||
    lower.includes(".jpg") ||
    lower.includes(".png") ||
    lower.includes(".webp") ||
    lower.includes(".avif");

  if (isImage) {
    suggestions.push(
      'Do not lazy-load above-the-fold LCP images. Use `loading="eager"` or omit the attribute.',
      'Add `fetchpriority="high"` to the LCP image to signal early loading.',
      'Use `<link rel="preload" as="image">` to preload the LCP image.',
      "Compress the image with AVIF or WebP to reduce transfer and decode time.",
      "Set explicit `width` and `height` to reduce layout shifts."
    );
  }

  // 🧠 Heuristic if image was small but LCP still high
  if (isImage && totalLCP > 3000 && loadSum < 1500) {
    suggestions.push(
      "The image loads fast, but LCP is still high — this could indicate JS blocking or style recalculations. Audit thread activity.",
      "Consider inlining this image as a base64 string if it’s very small and critical."
    );
  }

  // 🧼 Fallback suggestions
  if (suggestions.length < 5) {
    suggestions.push(
      "Copy the element class and use browser DevTool to confirm the LCP element.",
      "Use lightweight fonts for above-the-fold content to speed up LCP.",
      "Try to limit how many fonts you load—fewer fonts mean faster pages",
      "Use <link rel='preload'> for critical fonts, but limit the number to avoid blocking resources.",
      "Defer or async-load non-critical JavaScript.",
      "Minimize render-blocking styles.",
      <span key="more-info">
        Learn more at{" "}
        <a
          href="https://web.dev/lcp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-500 underline"
        >
          web.dev/lcp
        </a>
        .
      </span>
    );
  }

  return suggestions;
};

// find LCP component type
const getComponentType = (target: string): string => {
  const lower = target.toLowerCase();

  if (
    lower.includes("img") ||
    lower.includes(".jpg") ||
    lower.includes(".png") ||
    lower.includes(".webp") ||
    lower.includes(".avif")
  ) {
    return "Image";
  }

  if (lower.includes("video") || lower.includes(".mp4")) {
    return "Video";
  }

  if (
    lower.includes("button") ||
    lower.includes("click") ||
    lower.includes("cta")
  ) {
    return "Button or CTA";
  }

  if (
    lower.includes("font") ||
    lower.includes("title") ||
    lower.includes("h1") ||
    lower.includes("h2") ||
    lower.includes("headline")
  ) {
    return "Heading or Font";
  }

  if (
    lower.includes("header") ||
    lower.includes("nav") ||
    lower.includes("menu")
  ) {
    return "Navigation/Header";
  }

  if (
    lower.includes("p") ||
    lower.includes("paragraph") ||
    lower.includes("hero") ||
    lower.includes("intro")
  ) {
    return "Text Block";
  }

  return "Unknown Element";
};

const LCPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState("avg_lcp_value");
  const [selectedElement, setSelectedElement] = useState<LCPElementData | null>(
    null
  );

  const validSortKeys = new Set([
    "avg_lcp_value",
    "avg_resource_load_delay",
    "avg_resource_load_duration",
    "avg_element_render_delay",
  ]);

  const filteredData = useMemo(() => {
    const dedupedMap = new Map<string, LCPElementData>();

    data
      ?.filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase()
      )
      .forEach((item) => {
        const key = item.element_target?.trim().toLowerCase();
        if (!dedupedMap.has(key)) {
          dedupedMap.set(key, item);
        } else {
          const existing = dedupedMap.get(key)!;
          if (item.occurrence_count > existing.occurrence_count) {
            dedupedMap.set(key, item);
          }
        }
      });

    const sorted = Array.from(dedupedMap.values());

    if (validSortKeys.has(sortKey)) {
      sorted.sort((a, b) => {
        const valA = a[sortKey as keyof LCPElementData] as number;
        const valB = b[sortKey as keyof LCPElementData] as number;
        return (valB || 0) - (valA || 0);
      });
    }

    return sorted;
  }, [data, selectedDevice, sortKey]);

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="sweet-loading">
        <BeatLoader
          color={color}
          loading={loading}
          data-testid="loader"
          size={10}
        />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: LCP items with text and bar */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-sm text-primary/80 font-medium">
                What&apos;s causing LCP?
              </h3>
            </div>
            <select
              className="text-xs bg-gray-500/20 px-2 py-1 rounded border border-muted-foreground/10"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort by {opt.label}
                </option>
              ))}
            </select>
          </div>

          {filteredData.map((item, i) => {
            const { element_target, avg_lcp_value, occurrence_count } = item;

            return (
              <div
                key={i}
                className={`space-y-1 cursor-pointer p-2 rounded-sm border ${
                  selectedElement?.element_target === element_target
                    ? "bg-gray-100 dark:bg-gray-800 border-gray-400"
                    : "bg-muted/5 dark:border-gray-200/10 border-gray-200/80"
                }`}
                onClick={() => setSelectedElement(item)}
              >
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="truncate max-w-[60%]">{element_target}</span>
                  <span className="flex items-center gap-1 text-primary/40">
                    <span
                      className={` ${
                        avg_lcp_value <= 2500
                          ? "text-green-500"
                          : avg_lcp_value <= 4000
                          ? "text-orange-400"
                          : "text-red-500"
                      }`}
                    >
                      {Math.round(avg_lcp_value)}ms
                    </span>
                    | {occurrence_count}x
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Suggestions Panel */}
        <div className="space-y-4 md:sticky md:top-20 md:self-start">
          <h3 className="text-sm text-primary/80 font-medium">Suggestions</h3>
          {selectedElement ? (
            <div className="p-5 border rounded-md bg-muted/10 space-y-5">
              {/* Element Identifier */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">
                  {selectedElement.element_target}
                </p>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary/10 text-sm text-primary/80 rounded-full w-fit">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                  {getComponentType(selectedElement.element_target)}
                </div>
              </div>

              {/* Visual DevTools-style bar */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-primary/90">
                  Timing Breakdown
                </h4>
                <div className="flex w-full h-3 rounded overflow-hidden bg-muted">
                  {/* Load Delay */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-blue-300"
                        style={{
                          width: `${
                            (selectedElement.avg_resource_load_delay /
                              (selectedElement.avg_resource_load_delay +
                                selectedElement.avg_resource_load_duration +
                                selectedElement.avg_element_render_delay)) *
                            100
                          }%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Load Delay:{" "}
                      {Math.round(selectedElement.avg_resource_load_delay)}ms
                    </TooltipContent>
                  </Tooltip>

                  {/* Load Duration */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-blue-500"
                        style={{
                          width: `${
                            (selectedElement.avg_resource_load_duration /
                              (selectedElement.avg_resource_load_delay +
                                selectedElement.avg_resource_load_duration +
                                selectedElement.avg_element_render_delay)) *
                            100
                          }%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Load Duration:{" "}
                      {Math.round(selectedElement.avg_resource_load_duration)}ms
                    </TooltipContent>
                  </Tooltip>

                  {/* Render Delay */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-blue-700"
                        style={{
                          width: `${
                            (selectedElement.avg_element_render_delay /
                              (selectedElement.avg_resource_load_delay +
                                selectedElement.avg_resource_load_duration +
                                selectedElement.avg_element_render_delay)) *
                            100
                          }%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Render Delay:{" "}
                      {Math.round(selectedElement.avg_element_render_delay)}ms
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex justify-between text-xs text-primary/60 mt-1">
                  <span>
                    Load Delay:{" "}
                    {Math.round(selectedElement.avg_resource_load_delay)}ms
                  </span>
                  <span>
                    Duration:{" "}
                    {Math.round(selectedElement.avg_resource_load_duration)}ms
                  </span>
                  <span>
                    Render:{" "}
                    {Math.round(selectedElement.avg_element_render_delay)}ms
                  </span>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium text-primary/90 mb-2">
                  Tips to improve:
                </h4>
                <ul className="list-none space-y-2 text-[12px] text-primary/90">
                  {getSuggestions(
                    selectedElement.element_target,
                    selectedElement.avg_lcp_value,
                    selectedElement.avg_resource_load_delay,
                    selectedElement.avg_resource_load_duration,
                    selectedElement.avg_element_render_delay
                  ).map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="leading-snug">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* image if available */}
              <div className="md:block hidden md:space-y-3">
                {selectedElement?.image_url ? (
                  <Image
                    src={selectedElement.image_url}
                    width={200}
                    height={150}
                    alt={
                      selectedElement.image_url.split("/")[
                        selectedElement.image_url.split("/").length - 1
                      ]
                    }
                  />
                ) : null}
                <div className="text-[12px] text-primary/70">
                  Page:{" "}
                  {selectedElement?.page_url.includes("?")
                    ? selectedElement.page_url.split("?")[0]
                    : selectedElement.page_url}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-primary/40">
              Select an element on the left to view actionable optimization
              tips.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LCPBreakdownChart;

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
import { ChartPie } from "lucide-react";

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

export const getSuggestions = (elementTarget: string): ReactNode[] => {
  const lower = elementTarget.toLowerCase();
  const suggestions: ReactNode[] = [];

  // Images
  if (
    lower.includes("img") ||
    lower.includes("image") ||
    lower.includes(".jpg") ||
    lower.includes(".png") ||
    lower.includes(".webp")
  ) {
    suggestions.push(
      'Use the `loading="lazy"` attribute to defer offscreen images.',
      "Compress images using tools like TinyPNG or Squoosh.",
      "Serve images in WebP or AVIF formats for better performance.",
      "Set explicit width and height to avoid layout shifts.",
      "Avoid placing large images above the fold unless necessary."
    );
  }

  // Video
  if (lower.includes("video") || lower.includes(".mp4")) {
    suggestions.push(
      "Defer video loading until after user interaction.",
      "Use a static thumbnail (poster image) instead of autoplaying video.",
      "Avoid autoplay unless it provides essential value."
    );
  }

  // Buttons and CTAs
  if (
    lower.includes("button") ||
    lower.includes("click") ||
    lower.includes("cta")
  ) {
    suggestions.push(
      "Defer non-essential JavaScript to improve interactivity speed.",
      "Preload scripts that power critical button actions.",
      "Avoid large JS event handlers or visual effects on initial load."
    );
  }

  // Fonts / Headings
  if (
    lower.includes("font") ||
    lower.includes("title") ||
    lower.includes("h1") ||
    lower.includes("h2") ||
    lower.includes("headline")
  ) {
    suggestions.push(
      "Use `font-display: swap` in your CSS to prevent invisible text during font load.",
      "Inline critical font styles to render faster.",
      "Use system or variable fonts to reduce request size and render delays."
    );
  }

  // Navigation / Header
  if (
    lower.includes("header") ||
    lower.includes("nav") ||
    lower.includes("menu")
  ) {
    suggestions.push(
      "Keep header/nav components lightweight to avoid blocking LCP.",
      "Defer or async load navigation logic/scripts.",
      "Avoid putting large banners or carousels above the fold."
    );
  }

  // Paragraphs
  if (
    lower.includes("p") ||
    lower.includes("paragraph") ||
    lower.includes("hero") ||
    lower.includes("intro")
  ) {
    suggestions.push(
      "Use `font-display: swap` to avoid render-blocking fonts.",
      "Minimize the amount of text above the fold to reduce LCP size.",
      "Inline font and style CSS for paragraph text if it's above the fold.",
      "Avoid placing paragraphs inside lazy-loaded or delayed containers.",
      "Use system fonts or preload custom fonts used in paragraph styling."
    );
  }

  // Fallback suggestions if no matches
  if (suggestions.length === 0) {
    suggestions.push(
      "Audit the element's load/render timing using Chrome DevTools (Performance tab).",
      "Avoid blocking this element with large CSS or JS dependencies.",
      "Use async/defer for scripts that aren’t needed immediately.",
      "Minimize the size and complexity of above-the-fold content.",
      <span key="fallback-link">
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

const LCPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState("avg_lcp_value");
  const [selectedElement, setSelectedElement] = useState<LCPElementData | null>(
    null
  );

  const filteredData = useMemo(() => {
    return data
      ?.filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase()
      )
      .sort((a, b) => {
        const valA = Number(a[sortKey as keyof LCPElementData]);
        const valB = Number(b[sortKey as keyof LCPElementData]);
        return valB - valA;
      });
  }, [data, selectedDevice, sortKey]);

  //

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

  const maxLCP = Math.max(...filteredData.map((d) => d.avg_lcp_value + 100));

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: LCP items with text and bar */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ChartPie size={15} className="fill-green-500/30" />
              <h3 className="text-sm font-medium">LCP Breakdown</h3>
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
            const {
              element_target,
              avg_resource_load_delay,
              avg_resource_load_duration,
              avg_element_render_delay,
              avg_lcp_value,
              occurrence_count,
            } = item;

            const delayPct = (avg_resource_load_delay / maxLCP) * 100;
            const durationPct = (avg_resource_load_duration / maxLCP) * 100;
            const renderPct = (avg_element_render_delay / maxLCP) * 100;

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
                  <span className="text-muted-foreground">
                    {Math.round(avg_lcp_value)}ms | {occurrence_count}x
                  </span>
                </div>

                <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden flex mt-1">
                  {/* Load Delay */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-300"
                        style={{ width: `${delayPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Load Delay: {Math.round(avg_resource_load_delay)}ms
                    </TooltipContent>
                  </Tooltip>
                  {/* Duration */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${durationPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Load Duration: {Math.round(avg_resource_load_duration)}ms
                    </TooltipContent>
                  </Tooltip>
                  {/* Render Delay */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-700"
                        style={{ width: `${renderPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Render Delay: {Math.round(avg_element_render_delay)}ms
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Suggestions Panel */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Suggestions</h3>
          {selectedElement ? (
            <div className="p-4 border rounded-sm bg-muted/10 text-sm space-y-2">
              <p className="font-medium truncate">
                {selectedElement.element_target}
              </p>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {getSuggestions(selectedElement.element_target).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
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

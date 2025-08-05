"use client";

import React, { useMemo, useState, ReactNode } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";
import { ChartPie } from "lucide-react";

interface CLSElementData {
  device_type: string;
  affected_component: string;
  occurrence_count: number;
  avg_cls_value: number;
  min_cls_value: number;
  max_cls_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

interface Props {
  data: CLSElementData[];
}

const loading = true;
const color = "green";

const SORT_OPTIONS = [
  { label: "Avg CLS", value: "avg_cls_value" },
  { label: "Max CLS", value: "max_cls_value" },
  { label: "Occurrences", value: "occurrence_count" },
];

const getCLSSuggestions = (
  component: string,
  clsValue: number
): ReactNode[] => {
  const suggestions: ReactNode[] = [];
  const lower = component.toLowerCase();

  if (clsValue < 0.05) {
    suggestions.push("📗 Minor layout shift. Usually safe to ignore.");
    return suggestions;
  }

  if (clsValue < 0.25) {
    suggestions.push("🟡 Moderate CLS detected. Review the following:");
  } else {
    suggestions.push("🔴 High CLS detected! Fix it soon as possible");
  }

  // Ads
  if (
    lower.includes("ad") ||
    lower.includes("advertisement") ||
    lower.includes("banner") ||
    lower.includes("iframe")
  ) {
    suggestions.push(
      "CLS from ads: Reserve fixed space for ad containers.",
      "Avoid loading ads asynchronously without reserved space.",
      "Use ad provider tools/settings to minimize layout shifts.",
      "Use Chrome DevTools to identify layout shifts caused by ads."
    );
  }
  // Dynamic UI elements
  else if (
    lower.includes("modal") ||
    lower.includes("popup") ||
    lower.includes("accordion") ||
    lower.includes("dropdown") ||
    lower.includes("menu")
  ) {
    suggestions.push(
      "CLS from dynamic elements: Reserve space for expandable content.",
      "Avoid inserting or removing elements above existing content on interaction.",
      "Animate transitions to minimize layout shifts.",
      "Use Performance panel to trace JS that causes reflows."
    );
  }
  // Images / media
  else if (
    lower.includes("image") ||
    lower.includes("img") ||
    lower.includes(".jpg") ||
    lower.includes(".png") ||
    lower.includes(".webp")
  ) {
    suggestions.push(
      "Set width and height attributes on images.",
      "Use CSS aspect-ratio to reserve space before images load.",
      "Use placeholders or blurred previews to reduce shifts."
    );
  }
  // Fonts / Text
  else if (lower.includes("font") || lower.includes("text")) {
    suggestions.push(
      "Use `font-display: swap` to avoid invisible text during font loading.",
      "Avoid late-loading font styles causing reflow."
    );
  }
  // Layout elements (headers, nav, footers, etc.)
  else if (
    lower.includes("header") ||
    lower.includes("nav") ||
    lower.includes("footer") ||
    lower.includes("sidebar")
  ) {
    suggestions.push(
      "Reserve fixed height for layout containers.",
      "Avoid dynamically inserting content above existing content.",
      "Use min-height/min-width to stabilize layout."
    );
  }
  // Other fallback suggestions
  else {
    suggestions.push(
      "Use CSS min-height, min-width, or placeholders to reserve space.",
      "Avoid injecting content above already rendered content after page load.",
      "Use Chrome DevTools Layout Shift Regions to detect problem areas."
    );
  }

  suggestions.push(
    <span key="tools" className="text-primary/90">
      Learn more at{" "}
      <a
        href="https://web.dev/cls/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-primary"
      >
        web.dev/cls
      </a>
      .
    </span>
  );

  return suggestions;
};

const CLSBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState("avg_cls_value");
  const [selectedItem, setSelectedItem] = useState<CLSElementData | null>(null);

  const filteredData = useMemo(() => {
    return data
      ?.filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase() &&
          item.affected_component !== "unknown"
      )
      .sort((a, b) => {
        const valA = Number(a[sortKey as keyof CLSElementData]);
        const valB = Number(b[sortKey as keyof CLSElementData]);
        return valB - valA;
      });
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
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: CLS Elements */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ChartPie size={15} className="fill-green-500/30" />
              <h3 className="text-sm font-medium">CLS Breakdown</h3>
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

          {filteredData.map((item, i) => (
            <div
              key={i}
              className={`space-y-1 p-2 border rounded-sm cursor-pointer ${
                selectedItem?.affected_component === item.affected_component
                  ? "bg-gray-100 dark:bg-gray-800 border-gray-400"
                  : "bg-muted/5 dark:border-gray-200/10 border-gray-200/80"
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <p className="text-sm font-medium truncate text-primary/90">
                {item.affected_component}
              </p>
              <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden">
                <Tooltip>
                  <TooltipTrigger
                    className="block h-full bg-purple-500"
                    style={{ width: `${item.avg_cls_value * 100}%` }}
                  />
                  <TooltipContent>
                    Avg CLS: {item.avg_cls_value.toFixed(3)}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xs text-muted-foreground">
                Min: {item.min_cls_value.toFixed(3)} | Max:{" "}
                {item.max_cls_value.toFixed(3)} | Avg:{" "}
                {item.avg_cls_value.toFixed(3)} | Occurrences:{" "}
                {item.occurrence_count}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Suggestions */}
        <div className="space-y-4 md:sticky md:top-20 md:self-start">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-primary/80">Suggestions</h3>
          </div>

          {selectedItem ? (
            <div className="p-5 border rounded-md bg-muted/10 space-y-5">
              <div className="space-y-2">
                <p className="font-semibold text-primary">
                  {(() => {
                    let name = selectedItem.affected_component;

                    if (name.includes("#")) {
                      name = name.replace("#", "");
                    }

                    if (name.includes("/")) {
                      name = name.split("/")[0];
                    }

                    if (name.length > 100) {
                      name = name.replaceAll(".", " > ");
                    }

                    return name;
                  })()}
                </p>

                <ul className="list-none space-y-2 text-[12px] text-primary/90">
                  {getCLSSuggestions(
                    selectedItem.affected_component,
                    selectedItem.avg_cls_value
                  ).map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="leading-snug">{s}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="https://web.dev/cls/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline text-xs block pt-2"
                >
                  Learn more about CLS optimization
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a component to view actionable layout shift suggestions.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CLSBreakdownChart;

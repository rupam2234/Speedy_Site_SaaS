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
  { label: "Occurrences", value: "occurrence_count" },
  { label: "Max CLS", value: "max_cls_value" },
];

const getCLSSuggestions = (
  component: string,
  clsValue: number
): ReactNode[] => {
  const suggestions: ReactNode[] = [];

  if (clsValue < 0.05) {
    suggestions.push("📗 Minor layout shift. Can likely be ignored.");
    return suggestions;
  }

  if (clsValue < 0.25) {
    suggestions.push("🟡 Moderate CLS. Consider optimizing:");
  } else {
    suggestions.push("🔴 High CLS! Immediate optimization recommended:");
  }

  const lower = component.toLowerCase();

  if (
    lower.includes("image") ||
    lower.includes("img") ||
    lower.includes(".jpg") ||
    lower.includes(".png") ||
    lower.includes(".webp")
  ) {
    suggestions.push(
      "Set width and height on images to prevent layout shifts.",
      "Use aspect-ratio CSS property where appropriate."
    );
  }

  if (lower.includes("font") || lower.includes("text")) {
    suggestions.push(
      "Use `font-display: swap` to avoid invisible text on load.",
      "Avoid late-loading font styles affecting above-the-fold layout."
    );
  }

  if (
    lower.includes("button") ||
    lower.includes("header") ||
    lower.includes("nav")
  ) {
    suggestions.push(
      "Avoid inserting DOM nodes above already rendered content.",
      "Reserve space for dynamic components like navbars or headers."
    );
  }

  suggestions.push(
    "Reserve space using min-height, placeholders, or aspect-ratios.",
    "Avoid injecting content above existing content on interaction."
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
              <p className="text-xs font-medium truncate">
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
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Suggestions</h3>
          {selectedItem ? (
            <div className="p-4 border rounded-sm bg-muted/10 text-sm space-y-2">
              <p className="font-medium truncate">
                {selectedItem.affected_component}
              </p>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {getCLSSuggestions(
                  selectedItem.affected_component,
                  selectedItem.avg_cls_value
                ).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a component to view suggestions based on CLS severity.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CLSBreakdownChart;

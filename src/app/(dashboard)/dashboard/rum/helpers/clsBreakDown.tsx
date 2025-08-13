"use client";

import React, { useMemo, useState, useEffect, ReactNode } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";
import {
  ChartPie,
  AlertCircle,
  CheckCircle,
  TriangleAlert,
  Users,
  Clock,
} from "lucide-react";

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

  if (clsValue < 0.1) {
    suggestions.push(
      <span key="good" className="flex items-center gap-1">
        <CheckCircle size={14} className="text-green-500" /> Good CLS score
        (&lt;0.1). Maintain with:
      </span>
    );
    suggestions.push("Regularly monitor CLS in performance tools.");
    return suggestions;
  }

  if (clsValue < 0.25) {
    suggestions.push(
      <span key="moderate" className="flex items-center gap-1">
        <TriangleAlert size={14} className="text-yellow-500" /> Moderate CLS
        (0.1-0.25). Consider improving:
      </span>
    );
  } else {
    suggestions.push(
      <span key="poor" className="flex items-center gap-1">
        <AlertCircle size={14} className="text-red-500" /> High CLS (&gt;0.25).
        Urgent optimization needed:
      </span>
    );
  }

  if (
    lower.includes("ad") ||
    lower.includes("advertisement") ||
    lower.includes("banner") ||
    lower.includes("iframe")
  ) {
    suggestions.push(
      "Reserve fixed space for ad containers to prevent shifts.",
      "Use ad provider settings to minimize layout changes.",
      "Test ad loading behavior with Chrome DevTools."
    );
  } else if (
    lower.includes("modal") ||
    lower.includes("popup") ||
    lower.includes("accordion") ||
    lower.includes("dropdown") ||
    lower.includes("menu")
  ) {
    suggestions.push(
      "Reserve space for dynamic UI elements.",
      "Use CSS transitions to smooth expansions.",
      "Trace JS reflows in Performance panel."
    );
  } else if (
    lower.includes("image") ||
    lower.includes("img") ||
    lower.includes(".jpg") ||
    lower.includes(".png") ||
    lower.includes(".webp")
  ) {
    suggestions.push(
      "Set explicit width/height on images.",
      "Use CSS aspect-ratio for placeholders.",
      "Implement lazy loading with placeholders."
    );
  } else if (lower.includes("font") || lower.includes("text")) {
    suggestions.push(
      "Use `font-display: swap` for web fonts.",
      "Preload critical fonts to reduce FOUT."
    );
  } else if (
    lower.includes("header") ||
    lower.includes("nav") ||
    lower.includes("footer") ||
    lower.includes("sidebar")
  ) {
    suggestions.push(
      "Use fixed or min-height for layout containers.",
      "Avoid dynamic content injection above existing elements."
    );
  } else {
    suggestions.push(
      "Reserve space with min-height/width or placeholders.",
      "Use Chrome DevTools to identify shifting elements."
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

const getCLSInsights = (
  item: CLSElementData,
  maxPriorityScore: number
): {
  priority: string;
  priorityScore: number;
  severity: string;
  occurrence: string;
  occurrenceContext: string;
  action: string;
} => {
  const { avg_cls_value, max_cls_value, occurrence_count } = item;

  // Determine severity based on avg_cls_value
  const severity =
    avg_cls_value > 0.25
      ? "Poor"
      : avg_cls_value > 0.1
      ? "Needs Improvement"
      : "Good";

  // Calculate priority score for reference (for display only)
  const priorityScore = avg_cls_value * occurrence_count;
  const normalizedPriority = (priorityScore / maxPriorityScore) * 100;

  // Determine priority based on avg_cls_value, max_cls_value, and occurrence_count
  let priority: string;
  let action: string;

  if ((avg_cls_value > 0.25 || max_cls_value > 0.25) && occurrence_count > 1) {
    priority = "High Priority";
    action = "Fix immediately to improve user experience.";
  } else if (
    ((avg_cls_value > 0.1 && avg_cls_value <= 0.25) ||
      (max_cls_value > 0.1 && max_cls_value <= 0.25)) &&
    occurrence_count > 1
  ) {
    priority = "Moderate Priority";
    action = "Investigate and optimize to prevent potential impact.";
  } else if (
    (avg_cls_value > 0.25 || max_cls_value > 0.25) &&
    occurrence_count === 1
  ) {
    priority = "Moderate Priority";
    action = "Investigate and optimize to prevent potential impact.";
  } else {
    priority = "Low Priority";
    action = "Monitor to ensure CLS remains stable.";
  }

  // Determine occurrence and context
  const occurrence =
    occurrence_count > 50
      ? `Frequent (${occurrence_count} occurrences)`
      : occurrence_count > 10
      ? `Occasional (${occurrence_count} occurrences)`
      : `Rare (${occurrence_count} occurrence${
          occurrence_count === 1 ? "" : "s"
        })`;
  const occurrenceContext =
    occurrence_count > 50
      ? "Affects many users"
      : occurrence_count > 10
      ? "May warrant investigation"
      : "Possible false positive";

  return {
    priority,
    priorityScore: normalizedPriority,
    severity,
    occurrence,
    occurrenceContext,
    action,
  };
};

const CLSBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState<keyof CLSElementData>("avg_cls_value");
  const [selectedItem, setSelectedItem] = useState<CLSElementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate and filter data
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      console.error("Invalid data provided to CLSBreakdownChart:", data);
      return [];
    }

    const filtered = data
      .filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase() &&
          item.affected_component &&
          item.affected_component !== "unknown"
      )
      .sort((a, b) => {
        const valA = Number(a[sortKey]);
        const valB = Number(b[sortKey]);
        return valB - valA;
      });

    return filtered;
  }, [data, selectedDevice, sortKey]);

  // Calculate max priority score for normalization (for display only)
  const maxPriorityScore = useMemo(() => {
    const scores = filteredData.map(
      (item) => item.avg_cls_value * item.occurrence_count
    );
    return Math.max(...scores, 1); // Avoid division by zero
  }, [filteredData]);

  // Set default selected item
  useEffect(() => {
    if (filteredData.length > 0 && !selectedItem) {
      setSelectedItem(filteredData[0]);
    } else if (filteredData.length === 0) {
      setSelectedItem(null);
    }
    setIsLoading(false);
  }, [filteredData, selectedItem]);

  // Format component name for display
  const formatComponentName = (name: string, isLeftPanel: boolean = false) => {
    let formatted = name;
    if (name.includes("#")) {
      formatted = formatted.replace("#", "");
    }
    if (name.includes("/")) {
      formatted = formatted.split("/")[0];
    }
    if (name.length > 100) {
      formatted = formatted.replaceAll(".", " > ");
    }
    // Truncate all components in left panel, no truncation in right panel for ad-related
    if (isLeftPanel) {
      return formatted.length > 50 ? `${formatted.slice(0, 47)}...` : formatted;
    }
    const lower = formatted.toLowerCase();
    const isAdRelated =
      lower.includes("ad") ||
      lower.includes("advertisement") ||
      lower.includes("banner") ||
      lower.includes("iframe");
    return isAdRelated
      ? formatted
      : formatted.length > 50
      ? `${formatted.slice(0, 47)}...`
      : formatted;
  };

  if (isLoading) {
    return (
      <div className="sweet-loading">
        <BeatLoader
          color="#66cc8f"
          loading={true}
          data-testid="loader"
          size={10}
        />
      </div>
    );
  }

  if (!filteredData.length) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        No CLS data available for {selectedDevice}.
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
              onChange={(e) => {
                setSortKey(e.target.value as keyof CLSElementData);
              }}
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
              onClick={() => {
                setSelectedItem(item);
              }}
            >
              <p className="text-sm font-medium text-primary/90">
                {formatComponentName(item.affected_component, true)}
              </p>
              <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden">
                <Tooltip>
                  <TooltipTrigger
                    className="block h-full bg-purple-500"
                    style={{
                      width: `${Math.min(item.avg_cls_value * 100, 100)}%`,
                    }}
                  />
                  <TooltipContent>
                    Avg CLS: {item.avg_cls_value.toFixed(3)}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xs text-muted-foreground">
                Min: {item.min_cls_value.toFixed(3)} | Max:{" "}
                {item.max_cls_value.toFixed(3)} | Avg:{" "}
                {item.avg_cls_value.toFixed(3)}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Insights and Suggestions */}
        <div className="space-y-4 md:sticky md:top-20 md:self-start">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-primary/80">
              CLS Insights
            </h3>
          </div>

          {selectedItem ? (
            <div className="p-5 border rounded-lg bg-primary-foreground dark:bg-secondary-background">
              <div className="space-y-6">
                <p className="font-medium text-sm text-primary">
                  <span className="text-orange-500/70">
                    Affected Component:
                  </span>{" "}
                  {formatComponentName(selectedItem.affected_component)}
                </p>

                {/* Insight Section */}
                {(() => {
                  const {
                    priority,
                    priorityScore,
                    severity,
                    occurrence,
                    occurrenceContext,
                    action,
                  } = getCLSInsights(selectedItem, maxPriorityScore);
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="w-24 text-sm font-medium text-primary">
                          Priority
                        </span>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            priority === "High Priority"
                              ? "bg-red-500 text-white"
                              : priority === "Moderate Priority"
                              ? "bg-yellow-500 text-black"
                              : "bg-green-500 text-white"
                          }`}
                        >
                          {priority}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Score: {priorityScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="w-24 text-sm font-medium text-primary">
                          Severity
                        </span>
                        <span className="flex items-center gap-2">
                          {severity === "Poor" ? (
                            <AlertCircle size={16} className="text-red-500" />
                          ) : severity === "Needs Improvement" ? (
                            <TriangleAlert
                              size={16}
                              className="text-yellow-500"
                            />
                          ) : (
                            <CheckCircle size={16} className="text-green-500" />
                          )}
                          <span className="text-sm">{severity}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Avg CLS: {selectedItem.avg_cls_value.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="w-24 text-sm font-medium text-primary">
                          Occurrences
                        </span>
                        <span className="flex items-center gap-2 text-sm">
                          <Users size={16} className="text-primary/80" />
                          {occurrence}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {occurrenceContext}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 py-2">
                        <Clock size={16} className="text-primary/80 mt-0.5" />
                        <p
                          className={`text-sm ${
                            priority === "High Priority"
                              ? "text-red-600 dark:text-red-400"
                              : priority === "Moderate Priority"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {action}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <h4 className="font-semibold text-primary pt-4">Suggestions</h4>
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
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a component to view CLS insights and suggestions.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CLSBreakdownChart;

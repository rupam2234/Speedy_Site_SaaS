"use client";

import React, { useState, useMemo } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";

interface INPElementData {
  device_type: string;
  interaction_type: "pointer" | "keyboard";
  affected_element: string;
  occurrence_count: number;
  avg_inp_value: number;
  min_inp_value: number;
  max_inp_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

interface Props {
  data: INPElementData[];
}

const loading = true;
const color = "green";

const SORT_OPTIONS = [
  { label: "Avg INP", value: "avg_inp_value" },
  { label: "Max INP", value: "max_inp_value" },
  { label: "Min INP", value: "min_inp_value" },
];

const getINPSuggestions = (
  element: string,
  inpValue: number
): React.ReactNode[] => {
  const suggestions: React.ReactNode[] = [];

  if (inpValue <= 200) {
    suggestions.push("📗 Fast interaction – no action needed.");
    return suggestions;
  }

  if (inpValue <= 500) {
    suggestions.push("🟡 Moderate INP. Possible UX improvements:");
  } else {
    suggestions.push("🔴 Poor INP! Optimize interactions urgently:");
  }

  const lower = element.toLowerCase();

  if (
    lower.includes("button") ||
    lower.includes("click") ||
    lower.includes("submit")
  ) {
    suggestions.push(
      "Avoid heavy JavaScript execution on click handlers.",
      "Defer non-critical tasks until after interaction response.",
      "Preload data or cache results when possible."
    );
  }

  if (
    lower.includes("input") ||
    lower.includes("form") ||
    lower.includes("search")
  ) {
    suggestions.push(
      "Minimize re-renders on each keystroke.",
      "Avoid large DOM updates triggered by input."
    );
  }

  suggestions.push(
    "Reduce long tasks triggered by user input.",
    "Use requestIdleCallback or web workers for heavy processing.",
    "Avoid synchronous layout or blocking style recalculations."
  );

  return suggestions;
};

const INPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState("avg_inp_value");
  const [selectedItem, setSelectedItem] = useState<INPElementData | null>(null);

  const filteredData = useMemo(() => {
    return data
      ?.filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase()
      )
      .sort((a, b) => {
        const valA = Number(a[sortKey as keyof INPElementData]);
        const valB = Number(b[sortKey as keyof INPElementData]);
        return valB - valA;
      });
  }, [data, selectedDevice, sortKey]);

  const topOccurrences = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, 5);
  }, [filteredData]);

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

  const maxINP = Math.max(...filteredData.map((d) => d.max_inp_value + 50));

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: INP Elements */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-primary/80">
                INP Breakdown
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
            const avgPct = (item.avg_inp_value / maxINP) * 100;
            const minPct = (item.min_inp_value / maxINP) * 100;
            const maxPct = (item.max_inp_value / maxINP) * 100;

            return (
              <div
                key={i}
                className={`space-y-1 p-2 border rounded-sm cursor-pointer ${
                  selectedItem?.affected_element === item.affected_element
                    ? "bg-gray-100 dark:bg-gray-500/20 border-gray-400"
                    : "bg-muted/5 dark:border-gray-200/10 border-gray-200/80"
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <p className="text-xs font-medium truncate">
                  {item.affected_element}{" "}
                  <span className="italic text-muted-foreground">
                    ({item.interaction_type})
                  </span>
                </p>

                <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-300"
                        style={{ width: `${minPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Min INP: {Math.round(item.min_inp_value)}ms
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${avgPct - minPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Avg INP: {Math.round(item.avg_inp_value)}ms
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-700"
                        style={{ width: `${maxPct - avgPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Max INP: {Math.round(item.max_inp_value)}ms
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Suggestions and Top Occurring */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-primary/80">
            Suggestions (based on Max INP)
          </h3>
          {selectedItem ? (
            <div className="p-4 border rounded-sm bg-muted/10 text-sm space-y-2">
              <p className="font-medium truncate">
                {selectedItem.affected_element}
              </p>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {getINPSuggestions(
                  selectedItem.affected_element,
                  selectedItem.max_inp_value
                ).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select an element to view INP-based performance suggestions.
            </p>
          )}

          <h3 className="text-sm font-medium text-primary/80">
            Top Occurring Elements on {selectedDevice}
          </h3>

          {topOccurrences.map((item, i) => {
            const total =
              item.good_count + item.needs_improvement_count + item.poor_count;

            const goodPct = (item.good_count / total) * 100;
            const niPct = (item.needs_improvement_count / total) * 100;
            const poorPct = (item.poor_count / total) * 100;

            return (
              <div
                key={i}
                className="p-3 bg-muted/10 border rounded-sm space-y-1"
              >
                <p className="text-xs font-medium truncate">
                  {item.affected_element}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.occurrence_count} occurrences ({item.interaction_type})
                </p>

                <div className="h-2 w-full flex rounded overflow-hidden mt-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-[#00E676]"
                        style={{ width: `${goodPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>Good: {item.good_count}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-[#ffa11c]"
                        style={{ width: `${niPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Needs Improvement: {item.needs_improvement_count}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-[#FF3B30]"
                        style={{ width: `${poorPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>Poor: {item.poor_count}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default INPBreakdownChart;

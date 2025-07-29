"use client";

import React, { useMemo, useState } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";
import { ChartPie } from "lucide-react";

interface FCPData {
  device_type: string;
  connection_type: string;
  occurrence_count: number;
  avg_fcp_value: number;
  min_fcp_value: number;
  max_fcp_value: number;
  p75_fcp_value: number;
  p90_fcp_value: number;
  p95_fcp_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

interface Props {
  data: FCPData[];
}

const loading = true;
const color = "green";

const SORT_OPTIONS = [
  { label: "Average FCP", value: "avg_fcp_value" },
  { label: "P75", value: "p75_fcp_value" },
  { label: "P90", value: "p90_fcp_value" },
  { label: "P95", value: "p95_fcp_value" },
];

const getFCPSuggestions = (fcp: number): string[] => {
  const suggestions: string[] = [];

  if (fcp <= 1800) {
    suggestions.push("✅ FCP is fast. No major improvements needed.");
    return suggestions;
  }

  if (fcp <= 3000) {
    suggestions.push("⚠️ Moderate FCP. Consider:");
  } else {
    suggestions.push("🚨 Poor FCP! Optimization needed:");
  }

  suggestions.push(
    "Minimize render-blocking resources (CSS, fonts).",
    "Defer or async load non-critical JavaScript.",
    "Inline critical CSS to reduce render delay.",
    "Prioritize visible content using lazy loading.",
    "Serve images in modern formats (e.g. WebP).",
    "Reduce initial HTML size and complexity."
  );

  return suggestions;
};

const FCPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState<keyof FCPData>("avg_fcp_value");

  const filteredData = useMemo(() => {
    return [...data]
      .filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase()
      )
      .sort((a, b) => Number(b[sortKey]) - Number(a[sortKey]));
  }, [data, selectedDevice, sortKey]);

  if (!filteredData.length) {
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

  const maxFCP = Math.max(...filteredData.map((d) => d.max_fcp_value + 200));

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT: Breakdown by FCP */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ChartPie size={15} className="fill-green-500/30" />
              <h3 className="text-sm font-medium">FCP Breakdown</h3>
            </div>
            <select
              className="text-xs bg-gray-500/20 px-2 py-1 rounded border border-muted-foreground/10"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as keyof FCPData)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort by {opt.label}
                </option>
              ))}
            </select>
          </div>

          {filteredData.map((item, i) => {
            const avgPct = (item.avg_fcp_value / maxFCP) * 100;
            const p75Pct = (item.p75_fcp_value / maxFCP) * 100;
            const p90Pct = (item.p90_fcp_value / maxFCP) * 100;
            const p95Pct = (item.p95_fcp_value / maxFCP) * 100;

            return (
              <div
                key={i}
                className="space-y-2 border p-3 rounded-sm bg-muted/5"
              >
                <p className="text-xs font-medium capitalize">
                  {item.connection_type} ({Math.round(item.avg_fcp_value)}ms Avg
                  FCP)
                </p>

                <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-300"
                        style={{ width: `${avgPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Avg: {Math.round(item.avg_fcp_value)}ms
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${p75Pct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      P75: {Math.round(item.p75_fcp_value)}ms
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-700"
                        style={{ width: `${p90Pct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      P90: {Math.round(item.p90_fcp_value)}ms
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-blue-900"
                        style={{ width: `${p95Pct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      P95: {Math.round(item.p95_fcp_value)}ms
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  {getFCPSuggestions(item.avg_fcp_value).map((tip, idx) => (
                    <span key={idx}>{tip}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Connection Summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">
            Occurrence Breakdown ({selectedDevice})
          </h3>
          {filteredData.map((item, i) => {
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
                <p className="text-xs font-medium capitalize truncate">
                  {item.connection_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.occurrence_count} occurrences
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

export default FCPBreakdownChart;

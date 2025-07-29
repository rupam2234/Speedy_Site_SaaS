"use client";

import React, { useMemo, useState } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BeatLoader } from "react-spinners";
import { ChartPie } from "lucide-react";

interface TTFBData {
  device_type: string;
  connection_type: string;
  occurrence_count: number;
  avg_ttfb_value: number;
  min_ttfb_value: number;
  max_ttfb_value: number;
  avg_dns_duration: number;
  avg_connection_duration: number;
  avg_request_duration: number;
  avg_waiting_duration: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

interface Props {
  data: TTFBData[];
}

const loading = true;
const color = "green";

const SORT_OPTIONS = [
  { label: "TTFB", value: "avg_ttfb_value" },
  { label: "Request Time", value: "avg_request_duration" },
  { label: "DNS", value: "avg_dns_duration" },
  { label: "Connection", value: "avg_connection_duration" },
];

const getTTFBSuggestions = (ttfb: number): string[] => {
  const suggestions: string[] = [];

  if (ttfb <= 800) {
    suggestions.push("✅ TTFB is fast. No major action needed.");
    return suggestions;
  }

  if (ttfb <= 1800) {
    suggestions.push("⚠️ Moderate TTFB. Consider improving:");
  } else {
    suggestions.push("🚨 High TTFB! Optimization needed:");
  }

  suggestions.push(
    "Use a CDN to serve assets closer to users.",
    "Cache HTML pages at the edge when possible.",
    "Reduce server-side processing time (optimize backend logic).",
    "Avoid blocking database or API calls on initial request.",
    "Implement proper connection reuse (keep-alive, HTTP/2).",
    "Minimize redirects and use compression (gzip/brotli)."
  );

  return suggestions;
};

const TTFBBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState("avg_ttfb_value");

  const filteredData = useMemo(() => {
    return data
      .filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase()
      )
      .sort((a, b) => {
        const valA = Number(a[sortKey as keyof TTFBData]) || 0;
        const valB = Number(b[sortKey as keyof TTFBData]) || 0;
        return valB - valA;
      });
  }, [data, selectedDevice, sortKey]);

  const topConnections = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, 5);
  }, [filteredData]);

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

  const maxTTFB = Math.max(...filteredData.map((d) => d.avg_ttfb_value + 100));

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Summary + breakdown */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ChartPie size={15} className="fill-green-500/30" />
              <h3 className="text-sm font-medium">TTFB Breakdown</h3>
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
              connection_type,
              avg_dns_duration,
              avg_connection_duration,
              avg_request_duration,
              avg_waiting_duration,
              avg_ttfb_value,
            } = item;

            const dnsPct = (avg_dns_duration / maxTTFB) * 100;
            const connPct = (avg_connection_duration / maxTTFB) * 100;
            const reqPct = (avg_request_duration / maxTTFB) * 100;
            const waitPct = (avg_waiting_duration / maxTTFB) * 100;
            return (
              <div
                key={i}
                className="space-y-2 border p-3 rounded-sm bg-muted/5"
              >
                <p className="text-xs font-medium truncate capitalize">
                  {connection_type} ({Math.round(avg_ttfb_value)}ms TTFB)
                </p>

                <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-purple-200"
                        style={{ width: `${dnsPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      DNS: {Math.round(avg_dns_duration)}ms
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-purple-400"
                        style={{ width: `${connPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Connection: {Math.round(avg_connection_duration)}ms
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-purple-600"
                        style={{ width: `${reqPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Request: {Math.round(avg_request_duration)}ms
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full bg-purple-800"
                        style={{ width: `${waitPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Waiting: {Math.round(avg_waiting_duration)}ms
                    </TooltipContent>
                  </Tooltip>
                </div>

                <ul className="pl-4 list-disc text-xs text-muted-foreground space-y-1 mt-2">
                  {getTTFBSuggestions(avg_ttfb_value).map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Right: Top connection summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">
            Top Connection Types on {selectedDevice}
          </h3>
          {topConnections.map((item, i) => {
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

export default TTFBBreakdownChart;

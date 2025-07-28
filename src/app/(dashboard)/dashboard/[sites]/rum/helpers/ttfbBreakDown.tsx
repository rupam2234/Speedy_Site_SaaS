"use client";

import React, { useMemo, useState } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const SORT_OPTIONS = [
  { label: "TTFB", value: "avg_ttfb_value" },
  { label: "Request Time", value: "avg_request_duration" },
  { label: "DNS", value: "avg_dns_duration" },
  { label: "Connection", value: "avg_connection_duration" },
];

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

  const summary = useMemo(() => {
    if (!filteredData.length) return null;

    const totalTTFB = filteredData.reduce(
      (sum, d) => sum + d.avg_ttfb_value,
      0
    );
    const avgTTFB = totalTTFB / filteredData.length;

    const worst = filteredData.reduce((a, b) =>
      a.avg_ttfb_value > b.avg_ttfb_value ? a : b
    );

    if (avgTTFB <= 200) {
      return (
        <div className="p-3 rounded bg-green-100 text-green-800 text-xs border border-green-300">
          ✅ TTFB looks good overall on <b>{selectedDevice}</b>. Average TTFB:{" "}
          <b>{Math.round(avgTTFB)}ms</b>
        </div>
      );
    }

    if (avgTTFB <= 600) {
      return (
        <div className="p-3 rounded bg-yellow-100 text-yellow-800 text-xs border border-yellow-300">
          ⚠️ TTFB could be improved on <b>{selectedDevice}</b>. Average TTFB:{" "}
          <b>{Math.round(avgTTFB)}ms</b>. Most affected connection type:{" "}
          <b>{worst.connection_type}</b> ({Math.round(worst.avg_ttfb_value)}ms)
        </div>
      );
    }

    return (
      <div className="p-3 rounded bg-red-100 text-red-800 text-xs border border-red-300">
        🚨 Poor TTFB on <b>{selectedDevice}</b>! Average TTFB:{" "}
        <b>{Math.round(avgTTFB)}ms</b>. Worst offender:{" "}
        <b>{worst.connection_type}</b> ({Math.round(worst.avg_ttfb_value)}ms)
      </div>
    );
  }, [filteredData, selectedDevice]);

  if (!filteredData.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No TTFB data available for {selectedDevice}.
      </p>
    );
  }

  const maxTTFB = Math.max(...filteredData.map((d) => d.avg_ttfb_value + 100));

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Summary + breakdown */}
        <div className="space-y-4">
          {summary}

          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">TTFB Breakdown</h3>
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
            const ttfbPct = (avg_ttfb_value / maxTTFB) * 100;

            return (
              <div key={i} className="space-y-1">
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {connection_type}
                </p>

                <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden flex">
                  {/* DNS */}
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

                  {/* Connection */}
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

                  {/* Request */}
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

                  {/* Waiting */}
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

                  {/* TTFB Marker */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-0 bottom-0 w-[1px] bg-black dark:bg-white opacity-80"
                        style={{ left: `${ttfbPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      TTFB: {Math.round(avg_ttfb_value)}ms
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Top occurrence summary */}
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

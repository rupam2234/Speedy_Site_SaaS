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

const loading: boolean = true;
const color: string = "green";

const SORT_OPTIONS = [
  { label: "LCP", value: "avg_lcp_value" },
  { label: "Load Delay", value: "avg_resource_load_delay" },
  { label: "Duration", value: "avg_resource_load_duration" },
  { label: "Render Delay", value: "avg_element_render_delay" },
];

const LCPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState("avg_lcp_value");

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

  const topOccurrences = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, 5);
  }, [filteredData]);

  const summary = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const totalLCP = filteredData.reduce(
      (acc, item) => acc + item.avg_lcp_value,
      0
    );
    const avgLCP = totalLCP / filteredData.length;

    const worst = filteredData.reduce((a, b) =>
      a.avg_lcp_value > b.avg_lcp_value ? a : b
    );

    if (avgLCP <= 2500) {
      return (
        <div className="p-3 rounded bg-green-100 text-green-800 text-xs border border-green-300">
          ✅ LCP looks good overall on <b>{selectedDevice}</b>. Average LCP:{" "}
          <b>{Math.round(avgLCP)}ms</b>
        </div>
      );
    }

    if (avgLCP <= 4000) {
      return (
        <div className="p-3 rounded bg-yellow-100 text-yellow-800 text-xs border border-yellow-300">
          ⚠️ LCP could be improved on <b>{selectedDevice}</b>. Average LCP:{" "}
          <b>{Math.round(avgLCP)}ms</b>. Most affected element:{" "}
          <b>{worst.element_target}</b> ({Math.round(worst.avg_lcp_value)}ms)
        </div>
      );
    }

    return (
      <div className="p-3 rounded bg-red-100 text-red-800 text-xs border border-red-300">
        🚨 Poor LCP on <b>{selectedDevice}</b>! Average LCP:{" "}
        <b>{Math.round(avgLCP)}ms</b>. Worst offender:{" "}
        <b>{worst.element_target}</b> ({Math.round(worst.avg_lcp_value)}ms)
      </div>
    );
  }, [filteredData, selectedDevice]);

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
        {/* Left: Bar chart with sort */}
        <div className="space-y-4">
          {summary}

          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">LCP Breakdown</h3>
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
            } = item;

            const delayPct = (avg_resource_load_delay / maxLCP) * 100;
            const durationPct = (avg_resource_load_duration / maxLCP) * 100;
            const renderPct = (avg_element_render_delay / maxLCP) * 100;
            const lcpPct = (avg_lcp_value / maxLCP) * 100;

            return (
              <div key={i} className="space-y-1">
                <p className="text-xs text-muted-foreground truncate">
                  {element_target}
                </p>

                <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden flex">
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

                  {/* LCP Marker */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-0 bottom-0 w-[1px] bg-black dark:bg-white opacity-80"
                        style={{ left: `${lcpPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      LCP: {Math.round(avg_lcp_value)}ms
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Summary by occurrence */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">
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
                  {item.element_target}
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

export default LCPBreakdownChart;

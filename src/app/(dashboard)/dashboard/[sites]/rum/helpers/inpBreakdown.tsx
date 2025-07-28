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

const loading: boolean = true;
const color: string = "green";

const SORT_OPTIONS = [
  { label: "Avg INP", value: "avg_inp_value" },
  { label: "Max INP", value: "max_inp_value" },
  { label: "Min INP", value: "min_inp_value" },
];

const INPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState("avg_inp_value");

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

  const summary = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const total = filteredData.reduce(
      (acc, item) => acc + item.avg_inp_value,
      0
    );
    const avg = total / filteredData.length;

    const worst = filteredData.reduce((a, b) =>
      a.avg_inp_value > b.avg_inp_value ? a : b
    );

    if (avg <= 200) {
      return (
        <div className="p-3 rounded bg-green-100 text-green-800 text-xs border border-green-300">
          ✅ INP looks good overall on <b>{selectedDevice}</b>. Average INP:{" "}
          <b>{Math.round(avg)}ms</b>
        </div>
      );
    }

    if (avg <= 500) {
      return (
        <div className="p-3 rounded bg-yellow-100 text-yellow-800 text-xs border border-yellow-300">
          ⚠️ INP could be improved on <b>{selectedDevice}</b>. Average INP:{" "}
          <b>{Math.round(avg)}ms</b>. Most affected element:{" "}
          <b>{worst.affected_element}</b> ({Math.round(worst.avg_inp_value)}ms)
        </div>
      );
    }

    return (
      <div className="p-3 rounded bg-red-100 text-red-800 text-xs border border-red-300">
        🚨 Poor INP on <b>{selectedDevice}</b>! Average INP:{" "}
        <b>{Math.round(avg)}ms</b>. Worst offender:{" "}
        <b>{worst.affected_element}</b> ({Math.round(worst.avg_inp_value)}ms)
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

  const maxINP = Math.max(...filteredData.map((d) => d.max_inp_value + 50));

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Bar chart with sort */}
        <div className="space-y-4">
          {summary}

          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">INP Breakdown</h3>
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
              <div key={i} className="space-y-1">
                <p className="text-xs text-muted-foreground truncate">
                  {item.affected_element}{" "}
                  <span className="italic">({item.interaction_type})</span>
                </p>

                <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden flex">
                  {/* Min INP */}
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

                  {/* Avg INP */}
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

                  {/* Max INP */}
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

        {/* Right: Top Occurring Elements */}
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

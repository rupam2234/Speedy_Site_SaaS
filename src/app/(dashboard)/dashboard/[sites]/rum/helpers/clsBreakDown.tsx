"use client";

import React, { useMemo } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";

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

const loading: boolean = true;
const color: string = "green";

const CLSBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();

  const filteredData = useMemo(() => {
    return data
      ?.filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase() &&
          item.affected_component !== "unknown"
      )
      .sort((a, b) => b.avg_cls_value - a.avg_cls_value);
  }, [data, selectedDevice]);

  const topOccurrences = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, 5);
  }, [filteredData]);

  const summary = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const totalPoor = filteredData.reduce(
      (acc, item) => acc + item.poor_count,
      0
    );
    const totalCLS = filteredData.reduce(
      (acc, item) => acc + item.avg_cls_value,
      0
    );
    const avgCLS = totalCLS / filteredData.length;
    const worst = filteredData[0];

    if (avgCLS < 0.05 && totalPoor === 0) {
      return (
        <div className="p-3 rounded bg-green-100 text-green-800 text-xs border border-green-300">
          ✅ CLS looks good overall on <b>{selectedDevice}</b>. No significant
          layout shifts detected.
        </div>
      );
    }

    return (
      <div className="p-3 rounded bg-yellow-100 text-yellow-800 text-xs border border-yellow-300">
        ⚠️ CLS needs attention on <b>{selectedDevice}</b>. Largest layout shift
        seen on: <b className="text-xs">{worst.affected_component}</b> (avg CLS:{" "}
        <b>{worst.avg_cls_value.toFixed(3)}</b>)
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

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left Column: CLS Breakdown */}
      <div className="space-y-4">
        <div>{summary}</div>
        <h3 className="text-sm font-medium">CLS Breakdown</h3>

        {filteredData.map((item, i) => (
          <div key={i} className="space-y-1">
            <p className="text-xs text-muted-foreground truncate">
              {item.affected_component}
            </p>
            <div className="relative h-3 w-full bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${item.avg_cls_value * 100}%` }}
              >
                <Tooltip>
                  <TooltipTrigger className="block w-full h-full" />
                  <TooltipContent>
                    Avg CLS: {item.avg_cls_value.toFixed(3)}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Min: {item.min_cls_value.toFixed(3)} | Max:{" "}
              {item.max_cls_value.toFixed(3)} | Avg:{" "}
              {item.avg_cls_value.toFixed(3)}
            </div>
          </div>
        ))}
      </div>

      {/* Right Column: Top Occurrences */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          Top Occurring Elements on {selectedDevice}
        </h3>

        {topOccurrences.map((item, i) => {
          const total =
            item.good_count + item.needs_improvement_count + item.poor_count ||
            1;

          const goodPct = (item.good_count / total) * 100;
          const niPct = (item.needs_improvement_count / total) * 100;
          const poorPct = (item.poor_count / total) * 100;

          return (
            <div
              key={i}
              className="p-3 bg-muted/10 border rounded-sm space-y-1"
            >
              <p className="text-xs font-medium truncate">
                {item.affected_component}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.occurrence_count} occurrences
              </p>
              <div className="h-2 w-full flex rounded overflow-hidden mt-1">
                <Tooltip>
                  <TooltipTrigger
                    className="bg-[#00E676]"
                    style={{ width: `${goodPct}%` }}
                  />
                  <TooltipContent>Good: {item.good_count}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    className="bg-[#ffa11c]"
                    style={{ width: `${niPct}%` }}
                  />
                  <TooltipContent>
                    Needs Improvement: {item.needs_improvement_count}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    className="bg-[#FF3B30]"
                    style={{ width: `${poorPct}%` }}
                  />
                  <TooltipContent>Poor: {item.poor_count}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CLSBreakdownChart;

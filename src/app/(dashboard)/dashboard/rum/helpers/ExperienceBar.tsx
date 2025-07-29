"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React from "react";
import { getWebVitalColor } from "./color";

type ExperienceQuality = "Good" | "Okay" | "Poor";

export interface ExperienceData {
  device_type: string;
  experience_quality: ExperienceQuality;
  session_count: number;
  avg_fcp: number;
  avg_cls: number;
  avg_ttfb: number;
  avg_lcp: number;
  avg_inp: number;
  avg_performance_score: number;
  avg_long_tasks: number;
  avg_slow_api_calls: number;
  avg_trackers: number;
  percentage_in_device_type: number;
  country_count: number;
}

interface ExperienceBarChartProps {
  data: ExperienceData[];
  deviceType: string;
}

const COLORS: Record<ExperienceQuality, string> = {
  Good: "bg-[#66cc8f]",
  Okay: "bg-[#ffeea9]",
  Poor: "bg-[#FF9898]",
};

export default function ExperienceBar({
  data,
  deviceType,
}: ExperienceBarChartProps) {
  const filtered = data.filter(
    (d) => d.device_type.toLowerCase() === deviceType.toLowerCase()
  );

  const totalPercentage = filtered.reduce(
    (acc, curr) => acc + curr.percentage_in_device_type,
    0
  );

  return (
    <div className="w-full space-y-3">
      <div className="relative flex w-full h-12 rounded overflow-hidden bg-muted">
        {filtered.map((item, index) => {
          const width =
            (item.percentage_in_device_type / totalPercentage) * 100;
          const color = COLORS[item.experience_quality];

          return (
            <div
              key={index}
              className={`relative h-full ${color} transition-all duration-300`}
              style={{ width: `${width}%` }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full h-full cursor-help" />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="text-sm p-4 rounded-md shadow-md border bg-primary dark:bg-primary backdrop-blur-sm w-64 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {item.session_count} {item.experience_quality}{" "}
                      {item.session_count > 1 ? "Page Views" : "Page View"}
                    </span>
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-primary-foreground dark:text-primary-foreground">
                    <span className="font-medium">Avg FCP:</span>
                    <span className={getWebVitalColor("fcp", item.avg_fcp)}>
                      {item.avg_fcp} ms
                    </span>

                    <span className="font-medium">Avg CLS:</span>
                    <span className={getWebVitalColor("cls", item.avg_cls)}>
                      {item.avg_cls?.toFixed(3)}
                    </span>

                    <span className="font-medium">Avg TTFB:</span>
                    <span className={getWebVitalColor("ttfb", item.avg_ttfb)}>
                      {item.avg_ttfb} ms
                    </span>

                    <span className="font-medium">Avg LCP:</span>
                    <span className={getWebVitalColor("lcp", item.avg_lcp)}>
                      {item.avg_lcp} ms
                    </span>

                    <span className="font-medium">Avg INP:</span>
                    <span className={getWebVitalColor("inp", item.avg_inp)}>
                      {item.avg_inp} ms
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Labels & Percentages */}
              <div
                className="absolute top-3 flex items-center justify-center w-full text-center text-[16px] font-semibold dark:text-primary-foreground text-primary/80"
                style={{ pointerEvents: "none" }}
              >
                {item.percentage_in_device_type.toFixed(0)}%{" "}
                {item.experience_quality}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

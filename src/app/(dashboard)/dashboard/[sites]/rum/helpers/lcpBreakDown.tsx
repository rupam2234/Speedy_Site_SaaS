"use client";

import React from "react";

interface LCPElementData {
  element_target: string;
  avg_lcp_value: number;
  avg_resource_load_delay: number;
  avg_resource_load_duration: number;
  avg_element_render_delay: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  occurrence_count: number;
}

interface Props {
  data: LCPElementData[];
}

const ExperienceBar = ({
  good,
  needsImprovement,
  poor,
}: {
  good: number;
  needsImprovement: number;
  poor: number;
}) => {
  const total = good + needsImprovement + poor;
  if (total === 0) return null;

  const goodPct = (good / total) * 100;
  const needImprovementPct = (needsImprovement / total) * 100;
  const poorPct = (poor / total) * 100;

  return (
    <div className="w-full h-3 flex rounded overflow-hidden mt-2">
      <div className="bg-[#00E676]" style={{ width: `${goodPct}%` }}></div>
      <div
        className="bg-[#ffa11c]"
        style={{ width: `${needImprovementPct}%` }}
      ></div>
      <div className="bg-[#FF3B30]" style={{ width: `${poorPct}%` }}></div>
    </div>
  );
};

const LCPBreakdownChart: React.FC<Props> = ({ data }) => {
  const maxLCP = Math.max(...data.map((d) => d.avg_lcp_value + 100));

  return (
    <div className="space-y-6">
      {data.map((item, i) => {
        const {
          element_target,
          avg_resource_load_delay,
          avg_resource_load_duration,
          avg_element_render_delay,
          avg_lcp_value,
          good_count,
          needs_improvement_count,
          poor_count,
        } = item;

        return (
          <div key={i} className="p-4 border rounded bg-muted/20">
            <div className="text-sm font-medium mb-2 break-words">
              {element_target}
            </div>

            <div className="relative h-6 w-full bg-muted rounded-sm overflow-hidden mb-1">
              <div
                className="absolute top-0 left-0 h-full bg-blue-300"
                style={{
                  width: `${(avg_resource_load_delay / maxLCP) * 100}%`,
                }}
                title="Resource Load Delay"
              />
              <div
                className="absolute top-0 left-0 h-full bg-blue-500"
                style={{
                  left: `${(avg_resource_load_delay / maxLCP) * 100}%`,
                  width: `${(avg_resource_load_duration / maxLCP) * 100}%`,
                }}
                title="Resource Load Duration"
              />
              <div
                className="absolute top-0 h-full bg-blue-700"
                style={{
                  left: `${
                    ((avg_resource_load_delay + avg_resource_load_duration) /
                      maxLCP) *
                    100
                  }%`,
                  width: `${(avg_element_render_delay / maxLCP) * 100}%`,
                }}
                title="Element Render Delay"
              />

              {/* LCP Marker */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-black dark:bg-white"
                style={{
                  left: `${(avg_lcp_value / maxLCP) * 100}%`,
                }}
                title={`LCP: ${avg_lcp_value.toFixed(1)}ms`}
              />
            </div>

            {/* Labels */}
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Load delay: {Math.round(avg_resource_load_delay)}ms</span>
              <span>Duration: {Math.round(avg_resource_load_duration)}ms</span>
              <span>Render: {Math.round(avg_element_render_delay)}ms</span>
              <span>LCP: {Math.round(avg_lcp_value)}ms</span>
            </div>

            {/* Experience Bar */}
            <ExperienceBar
              good={good_count}
              needsImprovement={needs_improvement_count}
              poor={poor_count}
            />
          </div>
        );
      })}
    </div>
  );
};

export default LCPBreakdownChart;

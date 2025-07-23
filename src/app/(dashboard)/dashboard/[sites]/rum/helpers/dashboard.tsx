"use client";

import { useEffect, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import WebVitalsBar from "./distributions";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface WebVitalsMetric {
  domain_name: string;
  page: string | null;
  metric_name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
  sample_count: number;
  avg_value: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  min_value: number;
  max_value: number;
  good_percent: number;
  needs_improvement_percent: number;
  poor_percent: number;
}

export default function RumDashboard() {
  const { selectedSite } = useSiteContext();
  const [distdata, setDistData] = useState<WebVitalsMetric[]>([]);
  // const [loading, setLoading] = useState(true);

  async function GetDistribution() {
    try {
      const res = await fetch("/api/rum/percentile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: "7days",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDistData(data.metrics || []);
      } else {
        setDistData([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      setDistData([]);
    }
  }

  useEffect(() => {
    if (selectedSite) {
      GetDistribution();
    }
  }, [selectedSite]);

  function formatMetricValue(metric: WebVitalsMetric): string {
    if (metric.metric_name === "CLS") {
      return metric.p75.toFixed(3);
    }
    return `${Math.round(metric.p75)}`;
  }

  function getColorClass(metric: WebVitalsMetric): string {
    const { metric_name, p75 } = metric;

    switch (metric_name) {
      case "CLS":
        return p75 <= 0.1
          ? "text-green-600"
          : p75 <= 0.25
          ? "text-yellow-600"
          : "text-red-600";
      case "FCP":
        return p75 <= 1800
          ? "text-green-600"
          : p75 <= 3000
          ? "text-yellow-600"
          : "text-red-600";
      case "LCP":
        return p75 <= 2500
          ? "text-green-600"
          : p75 <= 4000
          ? "text-yellow-600"
          : "text-red-600";
      case "INP":
        return p75 <= 200
          ? "text-green-600"
          : p75 <= 500
          ? "text-yellow-600"
          : "text-red-600";
      case "TTFB":
        return p75 <= 800
          ? "text-green-600"
          : p75 <= 1800
          ? "text-yellow-600"
          : "text-red-600";
      default:
        return "text-gray-600";
    }
  }

  // if (loading) {
  //   return (
  //     <div className="text-sm text-muted-foreground mt-6">
  //       Loading metrics...
  //     </div>
  //   );
  // }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
      {distdata.map((metric) => {
        const label = metric.metric_name;
        const value = formatMetricValue(metric);
        const unit = metric.metric_name === "CLS" ? "" : "ms";
        const colorClass = getColorClass(metric);

        return (
          <div
            key={label}
            className="border rounded-sm p-4 dark:bg-secondary-background border-accent-foreground/20 bg-card text-card-foreground"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">{label}</h3>
              <div className="flex gap-2 items-center">
                <p className={`text-sm font-semibold ${colorClass}`}>
                  {value} {unit}
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help dark:text-accent-foreground text-accent bg-primary/80 dark:bg-secondary px-2 py-1 text-[12px] rounded-sm">
                      p75
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span>
                      Around 75% of users experienced
                      <span className="lowercase"> {label} around</span>:{" "}
                      {value}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <WebVitalsBar
              metricName={label}
              goodPercent={metric.good_percent}
              needsImprovementPercent={metric.needs_improvement_percent}
              poorPercent={metric.poor_percent}
              minValue={metric.min_value}
              maxValue={metric.max_value}
              percentileValue={metric.p75}
              percentileLabel="p75"
            />
          </div>
        );
      })}
    </div>
  );
}

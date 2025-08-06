"use client";

import { useSiteContext } from "../../siteContext";
import WebVitalsBar from "./distributions";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Bot, CircleGauge, Smile } from "lucide-react";
import CitationStatsCard, { DevicePerformanceData } from "./ai_citation";
import AnalyticsOverview, { AggregatedMetrics } from "./analyticsOverview";
import ExperienceBar, { ExperienceData } from "./ExperienceBar";
import SingleMetricChart, { Mixed_metric } from "./multiMetricChart";

export interface WebVitalsMetric {
  domain_name: string;
  device_type: string;
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

interface RumDashboardProps {
  distData: WebVitalsMetric[];
  experienceBarData: ExperienceData[];
  citationData: DevicePerformanceData;
  analyticsData: AggregatedMetrics;
  mixed_metric: Mixed_metric[];
}

export default function RumDashboard({
  distData,
  experienceBarData,
  citationData,
  analyticsData,
  mixed_metric,
}: RumDashboardProps) {
  const { rumDistribution, selectedDevice } = useSiteContext();

  function formatMetricValue(metric: WebVitalsMetric): string {
    const value = metric[rumDistribution];
    if (typeof value !== "number") return "--";

    return metric.metric_name === "CLS"
      ? value.toFixed(3)
      : `${Math.round(value)}`;
  }

  function getColorClass(metric: WebVitalsMetric): string {
    const value = metric[rumDistribution];

    if (typeof value !== "number") return "text-gray-600";

    switch (metric.metric_name) {
      case "CLS":
        return value <= 0.1
          ? "text-green-600"
          : value <= 0.25
          ? "text-yellow-600"
          : "text-red-600";
      case "FCP":
        return value <= 1800
          ? "text-green-600"
          : value <= 3000
          ? "text-yellow-600"
          : "text-red-600";
      case "LCP":
        return value <= 2500
          ? "text-green-600"
          : value <= 4000
          ? "text-yellow-600"
          : "text-red-600";
      case "INP":
        return value <= 200
          ? "text-green-600"
          : value <= 500
          ? "text-yellow-600"
          : "text-red-600";
      case "TTFB":
        return value <= 800
          ? "text-green-600"
          : value <= 1800
          ? "text-yellow-600"
          : "text-red-600";
      default:
        return "text-gray-600";
    }
  }

  return (
    <div className="space-y-15">
      <div className="mt-6">
        <AnalyticsOverview data={analyticsData} />
      </div>
      <div>
        <span className="flex items-center gap-2">
          <CircleGauge
            size={30}
            className="fill-pink-600/30 text-primary/70 dark:text-accent/70"
          />
          <h2 className="text-md md:text-2xl font-bold text-primary/90">
            Web Vitals
          </h2>
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {distData
            .filter(
              (metric) =>
                metric.device_type.toLowerCase() ===
                selectedDevice.toLowerCase()
            )
            .map((metric) => {
              const label = metric.metric_name;
              const unit = metric.metric_name === "CLS" ? "" : "ms";
              const value = formatMetricValue(metric);
              const colorClass = getColorClass(metric);

              const rawPercentile =
                typeof metric[rumDistribution] === "number"
                  ? (metric[rumDistribution] as number)
                  : undefined;

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
                            {rumDistribution}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span>
                            Around{" "}
                            {rumDistribution.toUpperCase().replace("P", "")}% of
                            users experienced
                            <span className="lowercase"> {label} ≤</span>{" "}
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
                    percentileValue={rawPercentile}
                    percentileLabel={rumDistribution}
                  />
                </div>
              );
            })}
        </div>
      </div>

      <div className="space-y-5">
        <span className="flex gap-2 items-center ">
          <span className="flex items-center gap-2">
            <Smile
              size={30}
              className="fill-green-200 text-primary/70 dark:text-accent/70"
            />
            <h2 className="text-md md:text-2xl font-bold text-primary/90">
              Pageviews Experience Distribution
            </h2>
          </span>
          {/* <Link href={`/dashboard/${selectedSite}/rum/session`}>
            <Link2
              size={20}
              className="mt-1 hover:text-blue-400 cursor-pointer"
            />
          </Link> */}
        </span>
        <div className="border rounded-sm  py-5 dark:bg-secondary-background border-accent-foreground/20 bg-card text-card-foreground">
          <ExperienceBar data={experienceBarData} deviceType={selectedDevice} />
        </div>

        <span className="flex gap-2 mt-15 items-center ">
          <span className="flex items-center gap-2">
            <Bot
              size={30}
              className="fill-purple-200 text-primary/70 dark:text-accent/70"
            />
            <h2 className="text-md md:text-2xl font-bold text-primary/90">
              AI Citation
            </h2>
          </span>
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 md:gap-4">
          <div className="col-span-1">
            <CitationStatsCard
              avg_citation_score={citationData?.avg_citation_score}
              min_citation_score={citationData?.min_citation_score}
              max_citation_score={citationData?.max_citation_score}
              std_dev_citation_score={citationData?.std_dev_citation_score}
              avg_ttfb={citationData?.avg_ttfb}
              avg_dom_content_loaded={citationData?.avg_dom_content_loaded}
              ai_citation_possibility={citationData?.ai_citation_possibility}
            />
          </div>
          <div className="col-span-2 bg-white border border-accent-foreground/20 dark:bg-secondary-background max-w-full p-4 rounded-sm">
            <SingleMetricChart data={mixed_metric} />
          </div>
        </div>
      </div>
    </div>
  );
}

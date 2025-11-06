import { useEffect, useState } from "react";
import ExperienceBar, { ExperienceData } from "../../helpers/ExperienceBar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import WebVitalsBar from "../../helpers/distributions";
import { Smile } from "lucide-react";

interface WebVitalProps {
  selectedSite: string;
  selectedDevice: "Desktop" | "Mobile" | "Tablet" | "All";
  fixedDateRange: "7days";
  rumDistribution: "p75" | "p50" | "p90" | "p95" | "p99";
}

export default function WebVitalsOverview({
  selectedSite,
  selectedDevice,
  fixedDateRange,
  rumDistribution,
}: WebVitalProps) {
  const [distdata, setDistData] = useState<WebVitalsMetric[]>([]);
  const [happinessData, setHappinessData] = useState<ExperienceData[]>([]);

  const isWebVitalsEmpty =
    !distdata ||
    distdata.filter(
      (metric) =>
        metric.device_type.toLowerCase() === selectedDevice.toLowerCase()
    ).length === 0;

  const isExperienceEmpty = !happinessData || happinessData.length === 0;

  useEffect(() => {
    if (!selectedSite) return;
    async function fetchData() {
      try {
        const res = await fetch("/api/rum/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain_name: selectedSite,
            date_range: fixedDateRange,
          }),
        });
        if (!res.ok) throw new Error("Failed to fetch RUM data");
        const data: any = await res.json();
        setDistData(data?.metrics?.webVitals || []);
        setHappinessData(data?.metrics?.userHappiness || []);
      } catch (error) {
        console.error("Error loading RUM data:", error);
        setDistData([]);
        setHappinessData([]);
      }
    }
    fetchData();
  }, [selectedSite]);

  return (
    <div className="space-y-8">
      {/* Web Vitals Cards */}
      <div>
        {isWebVitalsEmpty ? (
          <SkeletonCard title="Web Vitals" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
            {distdata
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
                              {rumDistribution.toUpperCase().replace("P", "")}%
                              of users experienced
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
        )}
      </div>
      {/* Experience Bar */}
      <div className="space-y-5">
        <span className="flex gap-2 items-center ">
          <span className="flex items-center gap-2">
            <Smile
              size={20}
              className="fill-green-200 text-primary/70 dark:text-accent/70"
            />
            <h2 className="text-md md:text-xl font-bold text-primary/90">
              Page Experience Group
            </h2>
          </span>
        </span>
        <div className="border rounded-sm py-5 dark:bg-secondary-background border-accent-foreground/20 bg-card text-card-foreground">
          {isExperienceEmpty ? (
            <SkeletonCard title="Experience Distribution" />
          ) : (
            <ExperienceBar
              data={happinessData ?? []}
              deviceType={selectedDevice}
            />
          )}
        </div>
      </div>
    </div>
  );

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

  function SkeletonCard({}: { title: string }) {
    return (
      <div className="flex flex-col gap-2 items-center justify-center text-center my-3 py-12 px-4 border rounded bg-muted/40 dark:bg-muted/20">
        <LoadingAnimation />
      </div>
    );
  }
}

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

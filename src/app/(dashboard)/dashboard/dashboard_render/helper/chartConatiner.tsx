"use client";

import {
  CoreWebVitalChart,
  cwv_metrics,
  DistributionChart,
  getColor,
} from "../helper";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CustomTooltip } from "@/components/theme";
import { useIsMobile } from "@/components/theme/use-mobile";
import { useSiteContext } from "../../siteContext";
import { CWVMetric } from "./cwvMetrics";

export default function DashboardChartContainer() {
  const {
    cruxData,
    dailyCrux,
    selectedDevice,
    experienceType,
    setExperienceType,
  } = useSiteContext();

  const isMobile = useIsMobile();

  const [activeMetric, setActiveMetric] = useState<CWVMetric>({
    acronym: "LCP",
    key: "largest_contentful_paint",
    label: "Largest Contentful Paint",
  });

  const [toggleMetric, setToggleMetric] = useState<boolean>(false);
  const metricDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!toggleMetric) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        metricDropdownRef.current &&
        !metricDropdownRef.current.contains(event.target as Node)
      ) {
        setToggleMetric(false);
      }
    }

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [toggleMetric]);

  const change = useMemo(() => {
    if (!cruxData || cruxData.length === 0) {
      return { change: 0, latestData: "--" };
    }

    const filteredData = cruxData.filter((x) => {
      switch (selectedDevice) {
        case "Desktop":
          return x.record.key.formFactor === "DESKTOP";
        case "Mobile":
          return x.record.key.formFactor === "PHONE";
        case "Tablet":
          return x.record.key.formFactor === "TABLET";
      }
    });

    const lastHistoryData = filteredData.flatMap((x) => {
      const p = x.record.metrics[activeMetric.key].percentilesTimeseries?.p75s;
      return p && p[p.length - 1];
    });

    const latestData =
      dailyCrux &&
      dailyCrux[0]?.record.metrics[activeMetric.key].percentiles.p75;

    if (lastHistoryData?.length && latestData) {
      return {
        change:
          ((Number(latestData) - Number(lastHistoryData[0])) /
            Number(lastHistoryData[0])) *
          100,
        latestData,
      };
    }

    return {
      change: 0,
      latestData: latestData ?? "--",
    };
  }, [selectedDevice, cruxData, dailyCrux, activeMetric]);

  return (
    <div className="p-5 bg-white dark:bg-secondary-background border rounded-sm border-primary/20">
      <div className="flex md:items-center flex-col md:flex-row gap-4 md:gap-0 md:justify-between">
        <div
          className="flex relative items-center gap-2 border-b border-primary/20 min-w-45 py-1 text-sm cursor-pointer"
          onClick={() => setToggleMetric((prev) => !prev)}
          ref={metricDropdownRef}
        >
          <p className="font-medium text-left">{activeMetric?.label}</p>

          <ArrowRight
            size={14}
            className={`text-primary/80 transition-transform duration-200 ${
              toggleMetric ? "rotate-45" : ""
            }`}
          />

          {toggleMetric && (
            <div className="bg-white dark:bg-gray-700 border-2 rounded-bl-sm rounded-br-sm border-primary/60 absolute top-7 left-0 text-primary text-sm min-w-50 z-20 flex flex-col">
              {cwv_metrics.map((item) => (
                <span
                  key={item.key}
                  className="px-2 py-0.75 border-b border-primary/5 hover:bg-primary/5 cursor-pointer font-medium"
                  onClick={() =>
                    setActiveMetric({
                      acronym: item.acronym,
                      key: item.key,
                      label: item.label,
                    })
                  }
                >
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex text-sm flex-col sm:flex-row items-start sm:items-center gap-4 px-3 py-1.5 bg-white dark:bg-primary/10 shadow-sm rounded-full border border-gray-200 dark:border-slate-800">
          <CustomTooltip
            delay={200}
            side="bottom"
            content={
              <div className="p-3 max-w-70 space-y-3">
                <p className="text-[12px] text-slate-300">
                  Current value is moving toward this expected value.
                </p>
              </div>
            }
            trigger={
              <p className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium cursor-help">
                Expecting next {activeMetric.acronym.toLowerCase()} of
                <span className="font-bold">
                  <span
                    className={`${getColor(
                      activeMetric.key,
                      Number(change.latestData),
                    )}`}
                  >
                    {change.latestData}
                  </span>
                </span>
              </p>
            }
          />

          <p className="flex items-center gap-2 text-primary/80 font-medium">
            Trend this week:
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-bold text-white ${
                change.change > 0 ? "bg-red-500" : "bg-green-500"
              }`}
            >
              {change.change > 0 ? "↑" : "↓"}{" "}
              {Math.abs(change.change).toFixed(2)}%
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {!isMobile && (
            <CustomTooltip
              content=<div className="space-y-3">
                <p>
                  p75 (75th percentile) in Web Vitals shows the value below
                  which 75% of users&apos; experiences fall, giving a quick
                  snapshot of how most visitors experience metrics like LCP,
                  FID, or CLS. It summarizes the majority experience while
                  ignoring extreme outliers.
                </p>
                <p>
                  Distribution shows the full range of user experiences, often
                  broken into &quot;Good,” “Needs Improvement,” and “Poor”
                  categories. It reveals how all users are affected, including
                  those with slow or problematic experiences, giving a more
                  detailed view than a single percentile.
                </p>
              </div>
            />
          )}

          <div className="flex items-center">
            {["Percentile", "Distribution"].map((x) => (
              <button
                key={x}
                onClick={() =>
                  setExperienceType(x as "Percentile" | "Distribution")
                }
                className={`px-3 py-0.5 text-sm ${
                  experienceType === x
                    ? "bg-primary text-white"
                    : "text-primary hover:bg-primary/10"
                }`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {experienceType === "Percentile" ? (
          <CoreWebVitalChart metric_key={activeMetric.key} />
        ) : (
          <DistributionChart metric_key={activeMetric.key} />
        )}
      </div>
    </div>
  );
}

"use client";

import {
  CoreWebVitalChart,
  cwv_metrics,
  DistributionChart,
  getColor,
} from "../helper";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, InfoIcon } from "lucide-react";
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
    if (toggleMetric === false) return;

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
  }, [toggleMetric]); // tracks outside click to close dropdown menu

  const change = useMemo(() => {
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
      dailyCrux[0].record.metrics[activeMetric.key].percentiles.p75;

    if (lastHistoryData && latestData) {
      return {
        change:
          ((Number(latestData) - Number(lastHistoryData[0])) /
            Number(lastHistoryData[0])) *
          100, // ( new value - old value / old value) * 100
        latestData: latestData,
      };
    } else
      return {
        change: 0,
        latestData: latestData ? latestData : "--",
      };
  }, [selectedDevice, cruxData, dailyCrux, activeMetric]); // calculates changes in metric

  return (
    <>
      {cruxData && cruxData.length > 0 ? (
        <div className="p-5 bg-white dark:bg-secondary-background border rounded-sm border-primary/20">
          <div className="flex md:items-center flex-col md:flex-row gap-4 md:gap-0 md:justify-between">
            <div
              className="flex relative items-center gap-2 border-b border-primary/20 min-w-45 py-1 text-sm cursor-pointer"
              onClick={() => setToggleMetric((prev) => !prev)}
              ref={metricDropdownRef}
            >
              <p className="font-medium text-left">
                {activeMetric && activeMetric.label}
              </p>
              <ArrowRight
                size={14}
                className={`text-primary/80 transition-transform duration-200 ${
                  toggleMetric ? "rotate-45" : "rotate-0"
                }`}
              />
              {toggleMetric && (
                <div className="bg-white dark:bg-gray-700 border-2 rounded-bl-sm rounded-br-sm border-primary/60 absolute top-7 left-0  text-primary text-sm min-w-50 z-20 h-auto flex flex-col">
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
              {/* Field Data Expectation Pill */}
              <CustomTooltip
                delay={200}
                side="bottom"
                content={
                  <div className="p-3 max-w-70 space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-[12px] text-slate-400 uppercase font-black tracking-wider italic">
                        Why &quot;Expecting&quot;?
                      </p>
                      <p className="text-[12px] text-slate-300 leading-normal">
                        Current value of active metric is moving toward this
                        value.
                      </p>
                    </div>
                  </div>
                }
                trigger={
                  <p className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium cursor-help group">
                    <svg
                      className="w-3.5 h-3.5 text-blue-500 opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Expecting next {activeMetric.acronym.toLowerCase()} of
                    <span className="font-bold">
                      {(() => {
                        const ranges = getColor(
                          activeMetric.key,
                          change.latestData as number,
                        );
                        return (
                          <span className={`${ranges} transition-colors`}>
                            {change.latestData}
                          </span>
                        );
                      })()}
                    </span>
                  </p>
                }
              />

              {/* Weekly Trend Component */}
              <p className="flex items-center gap-2 text-primary/80 dark:text-primary/80 font-medium">
                Trend this week:
                <span
                  className={`
                    px-3 py-0.5 rounded-full text-xs font-bold text-white 
                    ${change.change > 0 ? "bg-red-500" : "bg-green-500"} 
                    transition-colors duration-300
                  `}
                >
                  {change.change > 0 ? "↑" : "↓"}{" "}
                  {Math.abs(change.change).toFixed(2)}%
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {!isMobile ? (
                <CustomTooltip
                  content={
                    "Percentile indicates the value below which a certain percentage" +
                    "of users experience a metric, giving a sense of typical performance, " +
                    "while distribution shows how all user experiences are spread across good, " +
                    "average, and poor categories."
                  }
                  trigger={
                    <InfoIcon
                      size={25}
                      className="rounded-full text-primary/80 hover:bg-primary/10 p-1 cursor-pointer"
                    />
                  }
                />
              ) : (
                <></>
              )}

              <div className="flex items-center">
                {["Percentile", "Distribution"].map((x, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      setExperienceType(x as "Percentile" | "Distribution")
                    }
                    className={`px-3 py-0.5 text-sm transition-colors cursor-pointer duration-200
                      ${
                        experienceType === x
                          ? "bg-primary text-white dark:text-primary-foreground"
                          : "text-primary hover:bg-primary/10"
                      }
                  `}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {experienceType === "Percentile" ? (
            <CoreWebVitalChart metric_key={activeMetric.key} />
          ) : (
            <DistributionChart metric_key={activeMetric.key} />
          )}
        </div>
      ) : (
        // placeholder
        <div className="p-5 bg-white dark:bg-secondary-background border rounded-sm border-primary/20 animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-5 w-45 bg-primary/10 rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-primary/10 rounded" />
              <div className="h-6 w-24 bg-primary/10 rounded" />
            </div>
          </div>
          <div className="w-full h-87.5 bg-primary/5 rounded" />
        </div>
      )}
    </>
  );
}

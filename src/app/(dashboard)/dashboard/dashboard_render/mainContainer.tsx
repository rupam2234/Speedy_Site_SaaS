"use client";

import { useSiteContext } from "../siteContext";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CustomTooltip,
  HistrogramBar,
  RumWebVitalToolbar,
} from "@/components/utils";
import { Bookmark, HeartPulse, InfoIcon, MoveRight } from "lucide-react";
import { DailyCruxData } from "@/data-types";
import { cwv_metrics } from "./helper/cwvMetrics";
import { CruxMetricKey } from "@/data-types/dailyCrux";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardMainContainer() {
  const {
    selectedSite,
    setDailyCrux,
    dailyCrux,
    startDate,
    endDate,
    selectedDevice,
  } = useSiteContext();
  const isMobile = useIsMobile();

  const dailyCruxRef = useRef<string | null>(null);
  const [activeDailyCrux, setDailyActiveCrux] = useState<{
    dailyCruxData: DailyCruxData | null;
    status:
      | "Passing"
      | "Failing"
      | "Need improvement"
      | "Insufficient data"
      | "No data"
      | null;
  }>({ dailyCruxData: null, status: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSite) return;

    const key = `${selectedSite}-${startDate}-${endDate}`;

    if (dailyCruxRef.current !== key) {
      setLoading(true);
      fetchDailyWebVitals();
      dailyCruxRef.current = key;
    }
  }, [selectedSite, startDate, endDate]);

  useEffect(() => {
    if (!dailyCrux) {
      setDailyActiveCrux({ dailyCruxData: null, status: null });
      setLoading(false);
      return;
    }

    const filtered = dailyCrux.filter((x) => {
      if (!x.record?.key?.formFactor) return false;

      const formFactor = x.record.key.formFactor;
      switch (selectedDevice) {
        case "Desktop":
          return formFactor === "DESKTOP";
        case "Mobile":
          return formFactor === "PHONE";
        case "Tablet":
          return formFactor === "TABLET";
        default:
          return true;
      }
    });

    const p = (filtered && filtered[0].record.metrics) || null;

    const status = getWebVitalStatus({
      lcp: p !== null ? p?.largest_contentful_paint?.percentiles?.p75 : null,
      cls:
        p !== null
          ? Number(p?.cumulative_layout_shift?.percentiles?.p75)
          : null,
      inp: p !== null ? p?.interaction_to_next_paint?.percentiles?.p75 : null,
    });

    setDailyActiveCrux({
      dailyCruxData: filtered?.length ? filtered : null,
      status: status,
    });
    setLoading(false);
  }, [dailyCrux, selectedDevice]);

  return (
    <>
      <RumWebVitalToolbar
        enableDistribution={false}
        enableAllDevices={false}
        disableTablet={false}
        defaultDateRange={180}
      />
      <div className="flex flex-1 flex-col gap-6 py-6 px-5">
        <section id="web-vitals">
          <div className="flex flex-col items-start md:flex-row gap-2 md:items-center justify-between">
            <div className="flex gap-2 items-center">
              <HeartPulse
                size={24}
                className="fill-pink-600 dark:text-accent-foreground"
              />
              <h1 className="text-xl font-bold text-primary">
                {isMobile ? "CWV Status" : "Core Web Vital Status"}
              </h1>
              <MoveRight />
              {(() => {
                let p = activeDailyCrux.status;
                const borderColor =
                  p === "Passing"
                    ? "border-green-500"
                    : p === "Failing"
                      ? "border-red-500"
                      : p === "Need improvement"
                        ? "border-yellow-500"
                        : p === "Insufficient data"
                          ? "border-gray-500/30"
                          : "border-gray-500/30";
                const bgColour =
                  p === "Passing"
                    ? "bg-green-500/10"
                    : p === "Failing"
                      ? "bg-red-500/10"
                      : p === "Need improvement"
                        ? "bg-yellow-500/10"
                        : p === "Insufficient data"
                          ? "bg-gray-500/10"
                          : "bg-gray-500/10";

                return (
                  <span
                    className={`rounded-full text-primary text-sm ${borderColor} ${bgColour} border-2 font-medium dark:text-primary px-4 py-[2px]`}
                  >
                    {activeDailyCrux.status !== null
                      ? activeDailyCrux.status
                      : "Insufficient data"}
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-1">
              <CustomTooltip
                content={
                  <p>
                    This represents the latest Web Vitals (CrUX) data
                    you&apos;ll see in Google Search Console. For a deeper
                    understanding of your website&apos;s performance, set up{" "}
                    <span className="font-medium text-blue-400">
                      real user monitoring
                    </span>{" "}
                    to identify and fix issues before they impact your Core Web
                    Vitals globally.
                  </p>
                }
                trigger={
                  <p className="text-sm rounded-sm px-2 py-[2px] hover:bg-primary/5 text-primary/80">
                    What this means?
                  </p>
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {(loading || !activeDailyCrux
              ? Array.from({ length: 4 })
              : cwv_metrics
            ).map((_, idx) => {
              if (loading || !activeDailyCrux) {
                return (
                  <div key={idx}>
                    <div className="border rounded-sm p-4 dark:bg-secondary-background border-accent-foreground/20 bg-card text-card-foreground animate-pulse">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2 items-center">
                          <div className="w-5 h-5 rounded-full bg-primary/30"></div>
                          <div className="h-5 w-28 bg-primary/30 rounded"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-12 bg-primary/30 rounded"></div>
                          <div className="h-5 w-8 bg-primary/30 rounded ml-2"></div>
                        </div>
                      </div>
                      <div className="w-full mt-4 h-8 rounded-sm bg-primary/30 animate-pulse"></div>
                    </div>
                  </div>
                );
              }

              const { label, key, unit } = _ as (typeof cwv_metrics)[0];
              const prefix =
                activeDailyCrux.dailyCruxData?.[0].record.metrics?.[key];
              const percentile = prefix?.percentiles.p75 as number;
              const histrogram = prefix?.histogram;
              const metricColor = getColor({
                metric: key,
                value: percentile || 0,
              });

              return (
                <div key={key}>
                  <div className="border rounded-sm p-4 dark:bg-secondary-background border-accent-foreground/20 bg-card text-card-foreground">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 items-center">
                        {(label === "Largest Contentful Paint" ||
                          label === "Interaction to Next Paint" ||
                          label === "Cumulative Layout Shifts") && (
                          <CustomTooltip
                            trigger={
                              <Bookmark
                                size={20}
                                className="fill-blue-400 text-blue-400"
                              />
                            }
                            content="Major core web vital component"
                            delay={300}
                            side="top"
                          />
                        )}
                        <h3 className="text-[16px] text-primary/80 font-semibold">
                          {label}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex gap-[2px] items-center text-sm font-semibold ${metricColor}`}
                        >
                          {percentile ?? "--"}
                          <p>{unit}</p>
                        </span>
                        <CustomTooltip
                          content={`At least 75% of users experienced ${percentile} ${label.toLowerCase()}.`}
                          trigger={
                            <span className="cursor-help dark:text-accent-foreground text-accent bg-primary/80 dark:bg-secondary px-2 py-1 text-[12px] rounded-sm">
                              p75
                            </span>
                          }
                        />
                      </div>
                    </div>
                    <div>
                      {histrogram && histrogram.length > 0 ? (
                        <HistrogramBar
                          good={histrogram[0].density}
                          okay={histrogram[1].density}
                          bad={histrogram[2].density}
                        />
                      ) : (
                        <div className="w-full mt-4 h-8 rounded-sm bg-primary/30 animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );

  async function fetchDailyWebVitals() {
    if (!selectedSite) {
      setDailyCrux(null);
      return;
    }

    try {
      const res = await fetch("/api/crux/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: selectedSite }),
      });

      if (!res.ok) throw new Error("Core web vital daily data fetch failed.");

      const data: any = await res.json();
      setDailyCrux(data.data);
    } catch (err) {
      console.error(err);
      setDailyCrux(null);
    }
  }

  function getColor({
    metric,
    value,
  }: {
    metric: CruxMetricKey;
    value: number;
  }) {
    switch (metric) {
      case "largest_contentful_paint":
        return value < 2500
          ? "text-green-500"
          : value < 4000
            ? "text-yellow-500"
            : "text-red-500";
      case "interaction_to_next_paint":
        return value < 200
          ? "text-green-500"
          : value < 500
            ? "text-yellow-500"
            : "text-red-500";
      case "cumulative_layout_shift":
        return value < 0.1
          ? "text-green-500"
          : value < 0.25
            ? "text-yellow-500"
            : "text-red-500";
      case "experimental_time_to_first_byte":
        return value < 800
          ? "text-green-500"
          : value < 1800
            ? "text-yellow-500"
            : "text-red-500";
      default:
        return "text-primary/50";
    }
  }

  function getWebVitalStatus({
    lcp,
    inp,
    cls,
  }: {
    lcp: number | null;
    inp: number | null;
    cls: number | null;
  }):
    | "Passing"
    | "Failing"
    | "Need improvement"
    | "Insufficient data"
    | "No data" {
    if (lcp == null || inp == null || cls == null) {
      return "No data";
    } else if (lcp === 0 && inp === 0 && cls === 0) {
      return "Insufficient data";
    } else if (lcp > 4000 || inp > 500 || cls > 0.25) {
      return "Failing";
    } else if (lcp > 2500 || inp > 200 || cls > 0.1) {
      return "Need improvement";
    } else return "Passing";
  }
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { LoadingAnimation } from "@/components/theme/loadingAnimation";
import { CustomTooltip, useIsMobile } from "@/components/theme";
import { CruxMetricKey, DailyCruxData } from "@/data-types";
import { HistrogramBar, RumWebVitalToolbar } from "@/components/utils";
import { Bookmark, MoveRight } from "lucide-react";
import { cwv_metrics, DashboardChartContainer } from ".";

export default function Main() {
  const [showPrompt, setShowPrompt] = useState(false);
  const {
    selectedSite,
    setDailyCrux,
    dailyCrux,
    startDate,
    endDate,
    selectedDevice,
    setCruxData,
  } = useSiteContext();
  const isMobile = useIsMobile();

  const dailyCruxRef = useRef<string | null>(null);
  const cruxHistoryRef = useRef<string | null>(null);
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
    if (!selectedSite || !startDate || !endDate) return;

    const key = `${selectedSite}-${startDate}-${endDate}`;

    const d = dailyCruxRef.current !== key; // d denotes daily crux
    const h = cruxHistoryRef.current !== key; // h denotes history crux

    if (!d && !h) {
      return;
    }

    setLoading(true);

    Promise.all([
      d ? fetchDailyWebVitals() : Promise.resolve(), // if d is true then fetch or resolve (check as done)
      h ? fetchWebVitalHistory() : Promise.resolve(), // if h is true then fetch or resolve (check as done)
    ])
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });

    if (d) dailyCruxRef.current = key;
    if (h) cruxHistoryRef.current = key;
  }, [selectedSite, startDate, endDate]);

  useEffect(() => {
    if (!dailyCrux) {
      setDailyActiveCrux({ dailyCruxData: null, status: null });
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
  }, [dailyCrux, selectedDevice]);

  useEffect(() => {
    if (!selectedSite) {
      const timeout = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [selectedSite]);

  if (!selectedSite && !showPrompt) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  if (!selectedSite && showPrompt) {
    return (
      <div className="flex flex-col space-y-4 md:-mt-12.5 items-center justify-center min-h-full dark:text-secondary-background p-8">
        <p className="text-4xl md:text-6xl font-bold text-primary/50">
          Website 404
        </p>
        <p className="text-center text-muted-foreground w-full">
          We couldn&apos;t find the website you&apos;re looking for.
          <br />
          To get started, try{" "}
          <span className="font-medium text-foreground">
            adding a new site
          </span>{" "}
          using the left sidebar.
        </p>
      </div>
    );
  }

  return (
    <>
      <RumWebVitalToolbar
        enableDistribution={false}
        enableAllDevices={false}
        disableTablet={false}
        defaultDateRange={180}
        isSticky={true}
      />
      {/* web vital bar section */}
      <section id="web-vitals" className="py-6 px-5">
        <div className="flex flex-col items-start md:flex-row md:items-center justify-between">
          <div className="flex gap-2 items-center">
            <div
              className="w-6 h-6 rounded-full p-0.5"
              style={{
                background:
                  "conic-gradient(#FF9898 0% 33%, #ffeea9 33% 66%, #66cc8f 66% 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
            <h2 className="text-xl font-bold text-primary">
              {isMobile ? "CWV Status" : "Core Web Vital Status"}
            </h2>
            <MoveRight />
            {(() => {
              const p = activeDailyCrux.status;
              const borderColor =
                p === "Passing"
                  ? "border-green-300"
                  : p === "Failing"
                    ? "border-red-300"
                    : p === "Need improvement"
                      ? "border-yellow-300"
                      : p === "Insufficient data"
                        ? "border-gray-300/30"
                        : "border-gray-300/30";
              const bgColour =
                p === "Passing"
                  ? "bg-green-300/10"
                  : p === "Failing"
                    ? "bg-red-300/10"
                    : p === "Need improvement"
                      ? "bg-yellow-300/10"
                      : p === "Insufficient data"
                        ? "bg-gray-300/10"
                        : "bg-gray-300/10";

              return (
                <span
                  className={`rounded-full text-primary text-sm ${borderColor} ${bgColour} border-2 font-medium dark:text-primary px-4 py-0.5`}
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
                  This represents the latest Web Vitals (CrUX) data you&apos;ll
                  see in Google Search Console. For a deeper understanding of
                  your website&apos;s performance, set up{" "}
                  <span className="font-medium text-blue-400">
                    real user monitoring
                  </span>{" "}
                  to identify and fix issues before they impact your user
                  experience globally.
                </p>
              }
              trigger={
                <p className="text-sm rounded-sm px-2 py-0.5 hover:bg-primary/5 text-primary/80">
                  What this means?
                </p>
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          {(loading || !activeDailyCrux
            ? Array.from({ length: 4 })
            : cwv_metrics
          ).map((_, idx) => {
            if (loading || !activeDailyCrux) {
              return (
                <div key={idx}>
                  <div className="border rounded-sm p-4 dark:bg-secondary-background border-accent-foreground/20 bg-primary/5 text-card-foreground animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-2 items-center">
                        <div className="w-5 h-5 rounded-full bg-primary/30"></div>
                        <div className="h-5 w-28 bg-primary/5 rounded"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-12 bg-primary/5 rounded"></div>
                        <div className="h-5 w-8 bg-primary/5 rounded ml-2"></div>
                      </div>
                    </div>
                    <div className="w-full mt-4 h-8 rounded-sm bg-primary/5 animate-pulse"></div>
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
                        className={`flex gap-0.5 items-center text-sm font-semibold ${metricColor}`}
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
                      <div className="w-full mt-4 h-8 rounded-sm bg-primary/5 animate-pulse"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {/* chart section */}
      <section className="py-6 px-5 space-y-3">
        <div className="flex gap-2 items-center">
          <div className="text-xl flex items-center gap-4 font-bold text-primary">
            <CustomTooltip
              content={
                "Field Data comes from the Chrome User Experience Report. It represents the actual performance data Google collects from opted-in Chrome users over a 28-day rolling average. This is the specific data Google uses to determine your Search rankings (SEO)."
              }
              trigger={
                <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-green-600 font-black">
                    Field Data History
                  </span>
                </div>
              }
              side="right"
              delay={300}
            />
          </div>
          {/* rum CTA button */}

          <CustomTooltip
            content={
              <div className="flex flex-col gap-3 p-2 max-w-70">
                <div className="space-y-1">
                  <p className="text-xs leading-relaxed text-slate-200">
                    Field Data is delayed by 28 days and only tracks Chrome.
                    <strong>
                      {" "}
                      RUM shows you the broader picture on what&apos;s happening
                      right now.
                    </strong>
                  </p>
                </div>

                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-[11px] text-slate-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <span>
                      <strong>Live Feedback:</strong> See performance changes
                      instantly after a deployment.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-[11px] text-slate-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <span>
                      <strong>Full Coverage:</strong> Track Safari, Firefox, and
                      iOS users (which Google ignores).
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-[11px] text-slate-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <span>
                      <strong>Low-Traffic Visibility:</strong> Get data even if
                      you don&apos;t meet minimum traffic thresholds.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-[11px] text-slate-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <span>
                      <strong>Debug Mode:</strong> Identify exactly which
                      elements are causing layout shifts, largest contentful
                      paint and interection to next paint.
                    </span>
                  </li>
                </ul>

                <a
                  href={`/dashboard/rum/web-vitals?site=${selectedSite}`}
                  className="mt-1 w-full text-center bg-green-700 hover:bg-green-600 text-white text-[10px] font-black uppercase py-2 rounded transition-colors shadow-lg"
                >
                  Open RUM Dashboard
                </a>
              </div>
            }
            trigger={
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded-full border border-blue-500/20 transition-all group">
                <span className="h-2 w-2 rounded-full bg-blue-500 group-hover:scale-125 transition-transform" />
                <span className="text-[10px] uppercase tracking-wider text-blue-600 font-black flex items-center gap-1">
                  Why should you use Real User Monitoring?
                </span>
              </div>
            }
            side="right"
            maxWidth="400px"
            delay={300}
          />
        </div>
        <DashboardChartContainer />
      </section>
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
          ? "text-green-400"
          : value < 4000
            ? "text-yellow-300"
            : "text-red-300";
      case "interaction_to_next_paint":
        return value < 200
          ? "text-green-400"
          : value < 300
            ? "text-yellow-300"
            : "text-red-300";
      case "cumulative_layout_shift":
        return value < 0.1
          ? "text-green-400"
          : value < 0.25
            ? "text-yellow-300"
            : "text-red-300";
      case "experimental_time_to_first_byte":
        return value < 800
          ? "text-green-400"
          : value < 1800
            ? "text-yellow-300"
            : "text-red-300";
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
    } else if (lcp > 4000 || inp > 300 || cls > 0.25) {
      return "Failing";
    } else if (lcp > 2300 || inp > 200 || cls > 0.1) {
      return "Need improvement";
    } else return "Passing";
  }

  async function fetchWebVitalHistory() {
    if (!selectedSite) {
      setCruxData([]);
      return;
    }
    try {
      const res = await fetch("/api/crux/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: selectedSite }),
      });

      if (!res.ok) {
        setCruxData([]);
        throw new Error(res.statusText);
      }

      const body: any = await res.json();
      setCruxData(body.data);
    } catch (error) {
      console.error(error);
    }
  }
}

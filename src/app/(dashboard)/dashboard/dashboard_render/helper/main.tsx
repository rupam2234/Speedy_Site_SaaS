"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { LoadingAnimation } from "@/components/theme/loadingAnimation";
import { CustomTooltip, NoSiteSelected, useIsMobile } from "@/components/theme";
import { CruxMetricKey, DailyCruxData } from "@/data-types";
import { HistrogramBar, RumWebVitalToolbar } from "@/components/utils";
import { Bookmark, Lightbulb, MoveRight } from "lucide-react";
import {
  cwv_metrics,
  DashboardChartContainer,
  getP75Desc,
  getStatusColor,
} from ".";

export default function Main() {
  const {
    selectedSite,
    setDailyCrux,
    dailyCrux,
    startDate,
    endDate,
    selectedDevice,
    setCruxData,
    orders,
    isLoadingOrders,
  } = useSiteContext();
  const isMobile = useIsMobile();

  const dailyCruxRef = useRef<string | null>(null);
  const cruxHistoryRef = useRef<string | null>(null);
  const [activeDailyCrux, setDailyActiveCrux] = useState<{
    dailyCruxData: DailyCruxData | null;
    status: "Passing" | "Failing" | "Needs improvement" | "Empty data";
  }>({ dailyCruxData: null, status: "Empty data" });
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
      setDailyActiveCrux({ dailyCruxData: null, status: "Empty data" });
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

  if (isLoadingOrders) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  // No site selected
  if (!orders || orders.length === 0) {
    return <NoSiteSelected />;
  }

  if (!selectedSite) {
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
            <h2 className="text-xl font-bold text-primary/90">
              {isMobile ? "CWV Status" : "Core Web Vitals (via Google)"}
            </h2>
            <MoveRight />
            {(() => {
              const { bg, border } = getStatusColor({
                status: activeDailyCrux.status,
              });

              return (
                <>
                  {activeDailyCrux.status === "Empty data" ? (
                    <CustomTooltip
                      content={
                        <div className="flex flex-col gap-3 p-2 max-w-70">
                          <div className="space-y-1">
                            <p className="text-[13px] font-medium leading-relaxed text-primary-foreground dark:text-primary">
                              Empty bars usually occur due to limitations in how
                              Google collects real user experience data and
                              reported.
                            </p>
                          </div>

                          <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                              <p>
                                <span className="font-semibold">
                                  Low Traffic:
                                </span>{" "}
                                Insufficient visitors to meet Google&apos;s
                                minimum threshold for reporting.
                              </p>
                            </li>

                            <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                              <p>
                                <span className="font-semibold">
                                  User Opt-in:
                                </span>{" "}
                                Data is only collected from Chrome users who
                                sync history and share usage stats.
                              </p>
                            </li>

                            <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                              <p>
                                <span className="font-semibold">
                                  Discoverability:
                                </span>{" "}
                                Pages must be indexable and not blocked by
                                robots.txt or <code>noindex</code>.
                              </p>
                            </li>

                            <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                              <p>
                                <span className="font-semibold">New Site:</span>{" "}
                                It can take up to 28 days to gather enough data
                                for new or recently updated pages.
                              </p>
                            </li>
                          </ul>
                          <p>
                            Data appears here only when Google has reportable
                            information, just like the Web Vitals section in
                            Google Search Console.
                          </p>
                          <p className="flex items-start gap-2 text-primary-foreground/80 italic">
                            <Lightbulb size={35} className="fill-amber-300" />
                            That&apos;s why real user monitoring is essential—it
                            delivers actionable insights within few minutes of
                            setup (depending on your website&apos;s traffic
                            density).
                          </p>
                          <button
                            onClick={() =>
                              window.location.replace(
                                `/dashboard/rum/web-vitals?site=${selectedSite}`,
                              )
                            }
                            className="mt-1 w-full text-center bg-green-700 hover:bg-green-600 text-white text-[10px] font-black uppercase py-2 rounded transition-colors shadow-lg"
                          >
                            Open RUM Web Vitals
                          </button>
                        </div>
                      }
                      trigger={
                        <div
                          className={`rounded-full text-primary text-sm ${border} ${bg} cursor-help border-2 font-medium hover:bg-primary/10 dark:text-primary px-4 py-0.5`}
                        >
                          <p>Empty data ?</p>
                        </div>
                      }
                      side="bottom"
                    />
                  ) : (
                    <div
                      className={`rounded-full text-primary text-sm ${border} ${bg} border-2 font-medium px-4 py-0.5`}
                    >
                      {activeDailyCrux.status}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-1">
            <CustomTooltip
              content={
                <div className="flex flex-col gap-3 p-2 max-w-70">
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium leading-relaxed text-primary-foreground dark:text-primary">
                      This provides a real-world summary of your site&apos;s
                      performance and user experience for the latest available
                      time frame.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-primary-foreground/10 dark:border-primary/10 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground dark:text-primary">
                      Core Focus Areas
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                        <p>Loading Speed</p>
                      </li>
                      <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                        <p>Interactivity</p>
                      </li>
                      <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                        <p>Visual Stability</p>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2 border-t border-primary-foreground/10 dark:border-primary/10 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground dark:text-primary">
                      Device Breakdown
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                        <p>Desktop</p>
                      </li>
                      <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                        <p>Mobile</p>
                      </li>
                      <li className="flex items-start gap-2 text-[12px] text-primary-foreground/90 dark:text-primary/90">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                        <p>Tablet</p>
                      </li>
                    </ul>
                  </div>

                  <p className="text-[11px] italic text-primary-foreground/70 dark:text-primary/70">
                    Helps in visualizing performance and user experience across
                    all platforms at a glance.
                  </p>
                </div>
              }
              trigger={
                <p className="text-sm rounded-sm px-2 py-0.5 hover:bg-primary/5 text-primary/80">
                  What this means ?
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

            const { label, key, unit, acronym } = _ as (typeof cwv_metrics)[0];
            const prefix =
              activeDailyCrux.dailyCruxData?.[0].record.metrics?.[key];
            const percentile = prefix?.percentiles.p75 as number;
            const histrogram = prefix?.histogram;
            const metricColor = getColor({
              metric: key,
              value: percentile || 0,
            });

            const tip = getP75Desc({ metric: acronym, value: percentile });

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
                      {percentile ? (
                        <CustomTooltip
                          content={
                            <div className="h-8">
                              <span>{tip}</span>
                            </div>
                          }
                          trigger={
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex gap-0.5 items-center text-sm font-semibold ${metricColor}`}
                              >
                                {percentile ?? "--"}
                                <p>{unit}</p>
                              </span>
                              <span className="dark:text-accent-foreground text-accent bg-primary/80 dark:bg-secondary px-2 py-1 text-[12px] rounded-sm">
                                p75
                              </span>
                            </div>
                          }
                        />
                      ) : (
                        <>--</>
                      )}
                    </div>
                  </div>
                  <div>
                    {histrogram && histrogram.length > 0 ? (
                      <HistrogramBar
                        good={histrogram[0].density}
                        okay={histrogram[1].density}
                        bad={histrogram[2].density}
                        label={acronym}
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
                <div className="flex flex-col gap-3 p-2 max-w-70">
                  <p className="text-[13px] font-medium leading-relaxed text-primary-foreground dark:text-primary">
                    Field data refers to performance and user experience metrics
                    collected from real users on Chrome and aggregated by Google
                    to measure loading times, responsiveness, and stability of
                    your site.
                  </p>
                  <p className="text-[13px] font-medium leading-relaxed text-primary-foreground dark:text-primary">
                    The chart below shows your website&apos;s history for load
                    times, responsiveness, stability, and how quickly your
                    server begins sending data in response to user requests
                    across different devices.
                  </p>
                </div>
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

          <CustomTooltip
            content={
              <div className="flex flex-col gap-3 p-2 max-w-70">
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-primary-foreground dark:text-primary">
                    Google provides field data, but it&apos;s delayed and only
                    covers Chrome users.
                  </p>
                  <p className="text-[13px] font-medium text-primary-foreground dark:text-primary">
                    Real User Monitoring should give you faster UX insights,
                    help identify performance bottlenecks before they impact
                    your business.
                  </p>
                  <p className="text-[13px] font-medium text-primary-foreground dark:text-primary">
                    At Speedy Site -
                  </p>
                </div>

                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-[12px] text-primary-foreground/80 dark:text-primary/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                    <p>
                      You get to see user experience data within few minutes of
                      deployment.
                    </p>
                  </li>
                  <li className="flex items-start gap-2 text-[12px] text-primary-foreground/80 dark:text-primary/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                    <span>
                      Monitor users on any devices, browsers or networks to
                      optimize for all.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-[12px] text-primary-foreground/80 dark:text-primary/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                    <span>
                      Your site doesn&apos;t need to meet a minimum traffic
                      thresholds, we track each users while maintaining privacy
                      intact.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-[12px] text-primary-foreground/80 dark:text-primary/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                    <span>
                      It flags potential flaws in your site and notifies you
                      before they impact the majority of users.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-[12px] text-primary-foreground/80 dark:text-primary/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#50a2ff] mt-1 shrink-0" />
                    <span>There&apos;s more...</span>
                  </li>
                </ul>

                <a
                  href={`/dashboard/rum/web-vitals?site=${selectedSite}`}
                  className="mt-1 w-full text-center bg-green-700 hover:bg-green-600 text-white text-[10px] font-black uppercase py-2 rounded transition-colors shadow-lg"
                >
                  Start Exploring Real User Monitoring
                </a>
              </div>
            }
            trigger={
              <div className="flex items-center gap-2 px-2 py-1 bg-[#50a2ff]/20 rounded-full border border-blue-500/20 transition-all group">
                <span className="h-2 w-2 rounded-full bg-blue-500 group-hover:scale-125 transition-transform" />
                <span className="text-[10px] uppercase tracking-wider text-primary/80 dark:text-[#50a2ff] font-black flex items-center gap-1">
                  How monitoring your user experience at Speedy.site helps you?
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
  }): "Passing" | "Failing" | "Needs improvement" | "Empty data" {
    if (lcp == null || inp == null || cls == null) {
      return "Empty data";
    } else if (lcp > 4000 || inp > 300 || cls > 0.25) {
      return "Failing";
    } else if (lcp > 2300 || inp > 200 || cls > 0.1) {
      return "Needs improvement";
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

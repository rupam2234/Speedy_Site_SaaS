"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { cwv_ranges, scoreMetric } from "../../cwvRanges";
import { CustomTooltip, LoadingAnimation } from "@/components/theme";
import {
  RumCwvChart,
  LCPelements,
  CLSelements,
  INPelements,
  TTFBelements,
  getSidebarTooltip,
  Metric as MetricNorms,
} from ".";
import { BadgeInfo, InfoIcon } from "lucide-react";
import {
  cachedData,
  cleanExpiredCache,
  lazyload,
  RumWebVitalToolbar,
} from "@/components/utils";
import { CLSelementData } from "@/app/api/rum/elements/cls/route";
import { InpElementType } from "@/app/api/rum/elements/inp/route";

interface Metric {
  name: string;
  key: string;
  value: number | null | string;
}

type SidebarData = {
  cls: string | number;
  lcp: string | number;
  inp: string | number;
  fcp: string | number;
  ttfb: string | number;
};

const metrics: Metric[] = [
  {
    name: "Largest Contentful Paint",
    key: "LCP",
    value: 0,
  },
  { name: "Layout Shift", key: "CLS", value: 0 },
  { name: "Interaction to Next Paint", key: "INP", value: 0 },
  {
    name: "Time to First Byte",
    key: "TTFB",
    value: 0,
  },
  {
    name: "First Contentful Paint",
    key: "FCP",
    value: 0,
  },
];

interface getRumHistoryProps {
  startDate: string | undefined;
  endDate: string | undefined;
}

type MetricKey = "lcp" | "cls" | "inp" | "fcp" | "ttfb";

const RUM_CAPS: Record<MetricKey, { min: number; max: number }> = {
  lcp: { min: 0, max: 10000 },
  inp: { min: 0, max: 2000 },
  cls: { min: 0, max: 3 },
  fcp: { min: 0, max: 10000 },
  ttfb: { min: 0, max: 6000 },
};

export default function Main() {
  const { selectedSite, selectedDevice, rumDistribution, startDate, endDate } =
    useSiteContext();
  const [historyData, setRumHistoryData] = useState<any>();
  const [distData, setDistData] = useState<any>();
  const [activeMetric, setActiveMetric] = useState<
    "LCP" | "CLS" | "INP" | "TTFB" | "FCP"
  >("LCP");

  const [sideBarObj, setSidebarObj] = useState<SidebarData>();
  const [XpScore, setXpScore] = useState<number | null>();
  const [contributors, setContributors] = useState<any>();

  const triggerLazyload = useRef(null);
  const lazyloadKey = useRef<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    // clean up expired cache
    const keys = [
      "lcp-elements",
      "cls-elements",
      "inp-elements",
      "ttfb-breakdown",
    ];

    keys.forEach((x) =>
      cleanExpiredCache({ prefix: x, session_Storage: false }),
    );
  }, []);

  useEffect(() => {
    if (!selectedSite) return;

    const sDate = startDate?.toISOString().split("T")[0];
    const eDate = endDate?.toISOString().split("T")[0];

    if (startDate !== undefined || endDate !== undefined) {
      Promise.all([
        getRumHistory({
          startDate: sDate,
          endDate: eDate,
        }),
        getDistribution({
          startDate: sDate,
          endDate: eDate,
        }),
      ]);
    }
  }, [selectedSite, startDate, endDate]);

  useEffect(() => {
    if (!historyData) return;

    const totals: Record<string, number> = {
      cls: 0,
      fcp: 0,
      inp: 0,
      lcp: 0,
      ttfb: 0,
    };
    const counts: Record<string, number> = {
      cls: 0,
      fcp: 0,
      inp: 0,
      lcp: 0,
      ttfb: 0,
    };
    const weights = {
      cls: 0.4,
      fcp: 0,
      inp: 0.2,
      lcp: 0.3,
      ttfb: 0.1,
    };

    const slicedData =
      historyData.rum_history_data.length > 7
        ? historyData.rum_history_data.slice(-7)
        : historyData.rum_history_data;

    slicedData.forEach((x: any) => {
      ["cls", "fcp", "inp", "lcp", "ttfb"].forEach((key) => {
        const raw = Number(
          x?.[key]?.[selectedDevice?.toLowerCase()]?.[rumDistribution],
        );

        const capped = winsorize(
          raw,
          RUM_CAPS[key as MetricKey].min,
          RUM_CAPS[key as MetricKey].max,
        );

        if (!isNaN(capped)) {
          totals[key] += capped;
          counts[key] += 1;
        }
      });
    });

    const averages = {
      cls: counts.cls ? totals.cls / counts.cls : 0,
      fcp: counts.fcp ? totals.fcp / counts.fcp : 0,
      inp: counts.inp ? totals.inp / counts.inp : 0,
      lcp: counts.lcp ? totals.lcp / counts.lcp : 0,
      ttfb: counts.ttfb ? totals.ttfb / counts.ttfb : 0,
    };

    setSidebarObj(averages);

    // Weighted XP score
    const metricScores = {
      cls: scoreMetric(averages.cls, cwv_ranges.cls),
      fcp: scoreMetric(averages.fcp, cwv_ranges.fcp),
      inp: scoreMetric(averages.inp, cwv_ranges.inp),
      lcp: scoreMetric(averages.lcp, cwv_ranges.lcp),
      ttfb: scoreMetric(averages.ttfb, cwv_ranges.ttfb),
    };

    const xp =
      metricScores.cls * weights.cls +
      metricScores.fcp * weights.fcp +
      metricScores.inp * weights.inp +
      metricScores.lcp * weights.lcp +
      metricScores.ttfb * weights.ttfb;

    setXpScore(xp * 100);
  }, [historyData, selectedDevice, rumDistribution]);

  useEffect(() => {
    const key = `${selectedSite}-${activeMetric}`;

    if (lazyloadKey.current === key) return;

    // load valid cached data or pull fresh
    lazyload({
      fn: AnalysisHandler,
      refObj: triggerLazyload,
      rootMargin: "200px",
    });

    lazyloadKey.current = key;
    hasRun.current = false;
  }, [activeMetric, selectedSite]);

  const filteredContributors = useMemo(() => {
    if (!contributors) return [];

    const seen = new Set<string>();

    switch (activeMetric) {
      case "LCP":
        return contributors
          ?.filter((x: any) => x.device_type === selectedDevice)
          .sort((a: any, b: any) => b.avg_lcp_value - a.avg_lcp_value)
          .filter((x: any) => {
            const key = x.element_target || "unknown";

            // if (x.avg_lcp_value <= cwv_ranges.lcp[0]) return false;

            if (seen.has(key)) return false;
            seen.add(key);

            return true;
          });

      case "CLS":
        return contributors?.filter((x: CLSelementData) => {
          if (x.dev_type !== selectedDevice?.toLowerCase()) return false;
          // if (x.avg_magnitude <= 0.1) return false;
          if (x.occ_count < 2) return false;

          // if (seen.has(x.most_frequent_element)) return false;
          // seen.add(x.primary_target);

          return true;
        });

      case "INP":
        return contributors?.filter((x: InpElementType) => {
          if (x.device !== selectedDevice.toLowerCase()) return false;
          // if (x.inp_value <= 200) return false;

          if (seen.has(x.current_page)) {
            return false;
          }
          seen.add(x.current_page);

          return true;
        });

      case "TTFB":
        return Array.isArray(contributors)
          ? contributors.filter(
              (x: any) =>
                x.device_type === selectedDevice.toLowerCase() &&
                x.p75_ttfb > 800,
            )
          : [];

      default:
        return [];
    }
  }, [activeMetric, contributors, selectedSite, selectedDevice]);

  const { selectedDist, totalEvents } = useMemo(() => {
    const selectedDist =
      distData?.data
        .filter((x: any) => x.device_type === selectedDevice?.toLowerCase())
        .filter((metric: any) => metric.metric === activeMetric) ?? [];

    const totalEvents =
      selectedDist.length > 0
        ? selectedDist[0].good_count +
          selectedDist[0].needs_improvement_count +
          selectedDist[0].poor_count
        : 0;

    return { selectedDist, totalEvents };
  }, [distData, selectedDevice, activeMetric, startDate, endDate]);

  const activeSeries = useMemo(() => {
    if (historyData === undefined) return [];

    const metricKey = activeMetric?.toLowerCase() as MetricKey;

    return historyData.rum_history_data.map((x: any) => {
      const raw = Number(
        x?.[metricKey]?.[selectedDevice?.toLowerCase()]?.[rumDistribution],
      );

      const capped = winsorize(
        raw,
        RUM_CAPS[metricKey].min,
        RUM_CAPS[metricKey].max,
      );

      return [x.day, Number(capped.toFixed(2))];
    });
  }, [historyData, activeMetric, selectedDevice, rumDistribution]);

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <RumWebVitalToolbar
        enableDistribution={true}
        enableAllDevices={false}
        disableTablet={false}
        isSticky
      />
      <div className="m-5 grid grid-cols-1 md:grid-cols-12 gap-2 overflow-x-hidden">
        {/* Sidebar */}
        <div className="md:col-span-2 border border-primary/10 max-h-fit rounded-sm text-primary dark:bg-secondary-background/20 bg-transparent">
          {/* Metric list placeholder */}
          <div
            className={`bg-primary/5 h-fit p-4 space-y-3 border-b border-primary/10`}
          >
            <span className="flex items-center gap-2">
              <p className="text-sm font-semibold text-primary dark:text-primary/80">
                UX Score
              </p>
              <CustomTooltip
                side="bottom"
                trigger={
                  <InfoIcon
                    size={16}
                    className="text-primary/60 cursor-help hover:bg-primary/5 rounded-full transition-colors"
                  />
                }
                content={
                  <div className="flex flex-col gap-4 p-1">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      <div className="p-1.5 bg-green-500/20 rounded-lg text-green-400">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-100 uppercase tracking-tight">
                          User Experience Score
                        </span>
                        <span className="text-[10px] text-green-500 font-medium italic">
                          Aggregate Performance Health
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        What it is
                      </p>
                      <p className="text-xs leading-relaxed text-primary-foreground">
                        A single, weighted metric that summarizes your
                        site&apos;s overall page loading speed, responsiveness
                        and stability. It translates web vitals data (LCP, CLS,
                        INP including TTFB, FCP) into a &quot;health&quot; score
                        based on real visitor interactions.
                      </p>
                    </div>

                    {/* Focused "Why it's useful" */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Why it&apos;s useful
                      </p>

                      <div className="grid gap-4">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-primary-foreground/80">
                              The UX Score gives you an immediate answer to:
                              &quot;Is my site performing well for my users
                              right now?&quot;
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-primary-foreground/80">
                              By watching this score, you can catch gradual
                              performance regressions that haven&apos;t yet
                              triggered critical SEO failures but are starting
                              to degrade user experience.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-primary-foreground/80">
                              It uses the same industry-standard thresholds
                              (Good, Needs Improvement, Poor) as Core Web
                              Vitals, ensuring your internal monitoring stays
                              aligned with global performance standards.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
                width="400px"
              />
            </span>

            <div
              className="relative flex items-center justify-center w-12 h-12 rounded-full"
              style={
                {
                  "--xp": `${XpScore}%`,
                  background: `conic-gradient(#22c55e 0% var(--xp), #e5e7eb var(--xp) 100%)`,
                  transition: "all 1s ease-in-out",
                } as React.CSSProperties
              }
            >
              <div className="flex items-center justify-center w-10 h-10 bg-white/80 text-primary/80 dark:text-primary-foreground dark:bg-primary/50 rounded-full">
                <span className="text-[12px] font-bold">
                  {XpScore?.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {!metrics || !sideBarObj ? (
            Array.from({ length: 5 }).map((_, i) => <MetricSkeleton key={i} />)
          ) : (
            <>
              {metrics?.map((x) => (
                <div
                  onClick={() => {
                    setActiveMetric(
                      x.key as "LCP" | "CLS" | "INP" | "TTFB" | "FCP",
                    );
                  }}
                  key={x.key}
                  className={` ${activeMetric === x.key ? "bg-primary/10" : "bg-primary/5"} p-4 space-y-3 border-b border-primary/10 cursor-pointer`}
                >
                  <p className="text-sm font-medium text-primary dark:text-primary/80">
                    {x.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-[13px] font-sans">
                      {x.key === "LCP" ? (
                        <span
                          className={`${Number(sideBarObj?.lcp) <= cwv_ranges.lcp[0] ? `dark:text-[#66cc8f] text-green-500 font-semibold` : Number(sideBarObj?.lcp) > cwv_ranges.lcp[0] && Number(sideBarObj?.lcp) < cwv_ranges.lcp[1] ? `dark:text-[#FFEEA9] text-yellow-500 font-semibold` : `dark:text-[#FF9898] font-semibold text-red-500`}`}
                        >
                          {(Number(sideBarObj?.lcp) / 1000).toFixed(2)} Sec
                        </span>
                      ) : x.key === "CLS" ? (
                        <span
                          className={`${Number(sideBarObj?.cls) <= cwv_ranges.cls[0] ? `dark:text-[#66cc8f] text-green-500 font-semibold` : Number(sideBarObj?.cls) > cwv_ranges.cls[0] && Number(sideBarObj?.cls) < cwv_ranges.cls[1] ? `dark:text-[#FFEEA9] text-yellow-500 font-semibold` : `dark:text-[#FF9898] font-semibold text-red-500`}`}
                        >
                          {Number(sideBarObj?.cls).toFixed(4)}
                        </span>
                      ) : x.key === "FCP" ? (
                        <span
                          className={`${Number(sideBarObj?.fcp) <= cwv_ranges.fcp[0] ? `dark:text-[#66cc8f] text-green-500 font-semibold` : Number(sideBarObj?.fcp) > cwv_ranges.fcp[0] && Number(sideBarObj?.fcp) < cwv_ranges.fcp[1] ? `dark:text-[#FFEEA9] text-yellow-500 font-semibold` : `dark:text-[#FF9898] font-semibold text-red-500`}`}
                        >
                          {(Number(sideBarObj?.fcp) / 1000).toFixed(2)} Sec
                        </span>
                      ) : x.key === "INP" ? (
                        <span
                          className={`${Number(sideBarObj?.inp) <= cwv_ranges.inp[0] ? `dark:text-[#66cc8f] text-green-500 font-semibold` : Number(sideBarObj?.inp) > cwv_ranges.inp[0] && Number(sideBarObj?.inp) < cwv_ranges.inp[1] ? `dark:text-[#FFEEA9] text-yellow-500 font-semibold` : `dark:text-[#FF9898] font-semibold text-red-500`}`}
                        >
                          {Number(sideBarObj?.inp).toFixed(0)}
                        </span>
                      ) : x.key === "TTFB" ? (
                        <span
                          className={`${Number(sideBarObj?.ttfb) <= cwv_ranges.ttfb[0] ? `dark:text-[#66cc8f] text-green-500 font-semibold` : Number(sideBarObj?.ttfb) > cwv_ranges.ttfb[0] && Number(sideBarObj?.ttfb) < cwv_ranges.ttfb[1] ? `dark:text-[#FFEEA9] text-yellow-500 font-semibold` : `dark:text-[#FF9898] font-semibold text-red-500`}`}
                        >
                          {(Number(sideBarObj?.ttfb) / 1000).toFixed(2)} Sec
                        </span>
                      ) : (
                        `--`
                      )}
                    </p>
                    <CustomTooltip
                      content={
                        <>
                          {getSidebarTooltip({
                            metric: x.key as MetricNorms,
                          })}
                        </>
                      }
                      side="right"
                      trigger={
                        <BadgeInfo
                          size={16}
                          className="fill-blue-400 border-transparent text-primary-foreground/80 opacity-80"
                        />
                      }
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="md:col-span-10 border border-primary/10 rounded-sm bg-primary-foreground dark:bg-secondary-background md:ml-1 px-2 pb-4">
          <div className="relative flex gap-2 min-w-0 max-h-fit">
            <div className="w-full space-y-2">
              <RumCwvChart
                data={activeSeries}
                metric_key={activeMetric?.toLowerCase()}
                shares={selectedDist.length > 0 ? selectedDist[0] : null}
                total_events={totalEvents}
              />
            </div>
          </div>

          {/* Breakdown/Details placeholder */}
          <div
            ref={triggerLazyload}
            className="px-2 min-h-96 mt-2 md:mt-7 py-4"
          >
            <p className="text-primary/80 text-[12px] mb-3 font-semibold">
              These elements are currently impacting key Web Vitals metrics, and
              optimizing them can lead to immediate improvements in performance.
            </p>
            {filteredContributors === undefined ? (
              <></>
            ) : activeMetric === "LCP" ? (
              <LCPelements contributors={filteredContributors} />
            ) : activeMetric === "CLS" ? (
              <CLSelements contributors={filteredContributors} />
            ) : activeMetric === "INP" ? (
              <INPelements contributors={filteredContributors} />
            ) : activeMetric === "TTFB" ? (
              <TTFBelements contributors={filteredContributors} />
            ) : (
              <></>
            )}
          </div>

          {/* distributions accross various tabs */}
          {/* <BarGraphTabs activeMetric={activeMetric} /> */}
        </div>
      </div>
    </>
  );

  async function getRumHistory({ startDate, endDate }: getRumHistoryProps) {
    const cache_key = `rum-history:${selectedSite}-${startDate}-${endDate}`;

    try {
      const { response } = await cachedData({
        key: cache_key,
        fn: getRumHistoryData,
        session_Storage: false,
        ttl: 1000 * 60 * 5, // 5 minutes
      });

      setRumHistoryData(response);
    } catch (error: any) {
      console.error(error.message);
    }

    async function getRumHistoryData() {
      const res = await fetch("/api/rum/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: selectedSite,
          date_from: startDate,
          date_to: endDate,
        }),
      });

      const body: any = await res.json();

      if (!res.ok) {
        throw new Error(body.message);
      }

      return body;
    }
  }

  async function getDistribution({ startDate, endDate }: getRumHistoryProps) {
    const cacheKey = `rum_dist:${selectedSite}-${startDate}-${endDate}`;

    try {
      const { response } = await cachedData({
        fn: getDist,
        key: cacheKey,
        session_Storage: true,
        ttl: 5 * 60 * 1000,
      });

      setDistData(response);
    } catch (error: any) {
      console.error(error.message);
    }

    async function getDist() {
      const res = await fetch("/api/rum/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: selectedSite,
          startDate,
          endDate,
        }),
      });

      const data: any = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      return data;
    }
  }

  async function AnalysisHandler() {
    if (hasRun.current) return; // prevent duplicate runs

    if (activeMetric === "LCP") {
      try {
        setContributors([]);
        const key = `lcp-elements:${selectedSite}`;

        const { response } = await cachedData({
          fn: geLcpElements,
          key: key,
          session_Storage: false,
          ttl: 5 * 50 * 1000,
        });
        setContributors(response.data);
      } catch (error: any) {
        console.error(error.message);
      }

      async function geLcpElements() {
        const res = await fetch("/api/rum/elements/lcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain_name: selectedSite,
          }),
        });

        const body: any = await res.json();

        if (!res.ok) {
          throw new Error(body.message);
        }

        return body;
      }
    } else if (activeMetric === "CLS") {
      try {
        setContributors([]);
        const key = `cls-elements:${selectedSite}`;

        const { response } = await cachedData({
          fn: getClsElements,
          key: key,
          session_Storage: false,
          ttl: 5 * 60 * 1000,
        });

        setContributors(response.data);
      } catch (error) {
        console.error("Failed to fetch distribution:", error);
      }

      async function getClsElements() {
        const res = await fetch("/api/rum/elements/cls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: selectedSite,
          }),
        });

        const body: any = await res.json();

        if (!res.ok) {
          throw new Error(body.message);
        }
        return body;
      }
    } else if (activeMetric === "INP") {
      try {
        setContributors([]);
        const key = `inp-elements:${selectedSite}`;

        const { response } = await cachedData({
          fn: getInpElements,
          key: key,
          session_Storage: false,
          ttl: 5 * 60 * 1000,
        });

        setContributors(response.data);
      } catch (error) {
        console.error("Failed to fetch distribution:", error);
      }

      async function getInpElements() {
        const res = await fetch("/api/rum/elements/inp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain_name: selectedSite,
          }),
        });

        const body: any = await res.json();

        if (!res.ok) {
          throw new Error(body.message);
        }

        return body;
      }
    } else if (activeMetric === "TTFB") {
      try {
        setContributors([]);

        const key = `ttfb-breakdown:${selectedSite}`;

        const { response } = await cachedData({
          fn: getTtfbAnalysis,
          key: key,
          session_Storage: false,
          ttl: 5 * 60 * 1000,
        });

        setContributors(response.data);
      } catch (error: any) {
        console.error(error.message ?? "Failed to fetch ttfb analysis");
      }

      async function getTtfbAnalysis() {
        const res = await fetch("/api/rum/elements/ttfb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: selectedSite,
            dateFrom: startDate,
            dateTo: endDate,
          }),
        });

        const body: any = await res.json();

        if (!res.ok) {
          throw new Error(body.message);
        }

        return body;
      }
    }

    hasRun.current = true;
  }

  //handles bad data or unrealstick bumps
  function winsorize(value: number, min: number, max: number): number {
    if (isNaN(value)) return value;
    return Math.min(Math.max(value, min), max);
  }

  function MetricSkeleton() {
    return (
      <div className="bg-primary/5 p-4 space-y-3 border-b border-primary/10 animate-pulse">
        <div className="h-4 w-24 bg-primary/20 rounded" />
        <div className="h-4 w-32 bg-primary/20 rounded" />
      </div>
    );
  }
}

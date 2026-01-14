"use client";

import { useEffect, useMemo, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { cwv_ranges, scoreMetric } from "../../cwvRanges";
import TooltipIcon from "@/components/utils/customTooltip";
import RumCwvChart from "./chart";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import LCPelements from "./lcp";
import CLSelements from "./cls";
import INPelements from "./inp";
import TTFBelements from "./ttfb";
import { useWebVitalContext } from "../sharedProps";
import { da } from "date-fns/locale";

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
  const { selectedSite, selectedDevice, rumDistribution } = useSiteContext();
  const [historyData, setRumHistoryData] = useState<any>();
  const [rumDistData, setRumDistData] = useState<any>(); // distribution data
  const [activeMetric, setActiveMetric] = useState<
    "LCP" | "CLS" | "INP" | "TTFB" | "FCP"
  >("LCP");

  const [sideBarObj, setSidebarObj] = useState<SidebarData>();
  const [XpScore, setXpScore] = useState<number | null>();
  const [contributors, setContributors] = useState<any>();
  const { startDate, endDate } = useWebVitalContext();

  //#region Data manipulation
  const activeSeries = useMemo(() => {
    if (historyData === undefined) return [];

    const metricKey = activeMetric.toLowerCase() as MetricKey;

    return historyData.rum_history_data.map((x: any) => {
      const raw = Number(
        x?.[metricKey]?.[selectedDevice.toLowerCase()]?.[rumDistribution],
      );

      const capped = winsorize(
        raw,
        RUM_CAPS[metricKey].min,
        RUM_CAPS[metricKey].max,
      );

      return [x.day, Number(capped.toFixed(2))];
    });
  }, [historyData, activeMetric, selectedDevice, rumDistribution]);
  //#endregion

  //#region Effects
  useEffect(() => {
    if (activeMetric !== undefined) AnalysisHandler();
  }, [activeMetric, startDate, endDate]);

  useEffect(() => {
    if (!selectedSite) return;

    if (startDate !== undefined && endDate !== undefined) {
      getRumHistory({
        startDate: startDate?.toISOString().split("T")[0],
        endDate: endDate?.toISOString().split("T")[0],
      }); // get history chart data
    }
  }, [selectedSite, startDate, endDate]);

  useEffect(() => {
    if (!selectedSite) return;

    if (startDate !== undefined && endDate !== undefined) {
      getDistribution({
        startDate: startDate?.toISOString().split("T")[0],
        endDate: endDate?.toISOString().split("T")[0],
      }); // get distribution data
    }
  }, [selectedSite, startDate, endDate, activeMetric]);

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
      cls: 0.2,
      fcp: 0,
      inp: 0.2,
      lcp: 0.3,
      ttfb: 0.3,
    };

    historyData.rum_history_data.forEach((x: any) => {
      ["cls", "fcp", "inp", "lcp", "ttfb"].forEach((key) => {
        const metricKey = activeMetric.toLowerCase() as MetricKey;

        const raw = Number(
          x?.[key]?.[selectedDevice.toLowerCase()]?.[rumDistribution],
        );

        const capped = winsorize(
          raw,
          RUM_CAPS[metricKey].min,
          RUM_CAPS[metricKey].max,
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

  const filteredContributors = useMemo(() => {
    if (!contributors) return [];

    const seen = new Set<string>();

    switch (activeMetric) {
      case "LCP":
        return contributors.metrics?.filter((x: any) => {
          if (x.device_type !== selectedDevice) return false;
          if (seen.has(x.element_target)) return false;
          if (x.avg_lcp_value <= cwv_ranges.lcp[0]) return false;

          seen.add(x.element_target);
          return true;
        });

      case "CLS":
        return contributors.clsData?.filter((x: any) => {
          if (x.device_type !== selectedDevice.toLowerCase()) return false;
          if (x.cls_value <= 0.1) return false;

          if (seen.has(x.largest_shift_target)) return false;
          seen.add(x.largest_shift_target);

          return true;
        });

      case "INP":
        return contributors.metrics?.filter((x: any) => {
          if (x.device_type !== selectedDevice.toLowerCase()) return false;
          if (x.avg_inp_value <= 200) return false;

          if (seen.has(x.affected_element)) return false;
          seen.add(x.affected_element);

          return true;
        });

      case "TTFB":
        return Array.isArray(contributors)
          ? contributors.filter(
              (x: any) =>
                x.device_type === selectedDevice.toLowerCase() &&
                x.ttfb_ms > 800,
            )
          : [];

      default:
        return [];
    }
  }, [activeMetric, contributors, selectedDevice]);
  //#endregion

  const { selectedDist, totalEvents } = useMemo(() => {
    const selectedDist =
      rumDistData?.data.filter(
        (x: any) => x.device_type === selectedDevice.toLowerCase(),
      ) ?? [];

    const totalEvents =
      selectedDist.length > 0
        ? selectedDist[0].good_count +
          selectedDist[0].needs_improvement_count +
          selectedDist[0].poor_count
        : 0;

    return { selectedDist, totalEvents };
  }, [rumDistData, selectedDevice, startDate, endDate]);

  if (!historyData || !rumDistData) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <div className="m-5 grid grid-cols-1 md:grid-cols-12 gap-2 overflow-x-hidden">
        {/* Sidebar */}
        <div className="md:col-span-2 border border-primary/10 max-h-fit rounded-sm text-primary dark:bg-secondary-background/20 bg-transparent">
          {/* Metric list placeholder */}
          <div
            className={`bg-primary/5 cursor-help h-fit p-4 space-y-3 border-b border-primary/10`}
          >
            <p className="text-sm font-semibold text-primary dark:text-primary/80">
              User Experience Score
            </p>
            <TooltipIcon
              content={
                "Site performance score (0–100%), calculated from all Core Web Vitals metrics."
              }
              side="right"
              trigger={
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
              }
            />
          </div>
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
              <p className="text-[13px] font-sans">
                <span>Average: </span>
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
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="md:col-span-10 border border-primary/10 rounded-sm bg-primary-foreground dark:bg-secondary-background md:ml-1 px-2 py-4">
          <div className="relative flex gap-2 min-w-0 max-h-fit">
            <div className="w-full space-y-2">
              <RumCwvChart
                data={activeSeries}
                metric_key={activeMetric.toLowerCase()}
                shares={selectedDist.length > 0 ? selectedDist[0] : null}
                total_events={totalEvents}
              />
            </div>
          </div>

          {/* Breakdown/Details placeholder */}
          <div className="px-2 md:mt-6 mt-2 py-4">
            {filteredContributors === undefined ||
            filteredContributors.length === 0 ? (
              <></>
            ) : activeMetric === "LCP" ? (
              <LCPelements contributors={filteredContributors} />
            ) : activeMetric === "CLS" ? (
              <CLSelements
                contributors={filteredContributors}
                selectedSite={selectedSite}
              />
            ) : activeMetric === "INP" ? (
              <INPelements contributors={filteredContributors} />
            ) : activeMetric === "TTFB" ? (
              <TTFBelements contributors={filteredContributors} />
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </>
  );

  async function getRumHistory({ startDate, endDate }: getRumHistoryProps) {
    const cache_key = `rum-history:${selectedSite}`;
    const cached = localStorage.getItem(cache_key);

    if (cached !== null) {
      try {
        const {
          startDate: cachedStart,
          endDate: cachedEnd,
          data,
        } = JSON.parse(cached);

        // Only reuse if range matches
        if (cachedStart === startDate && cachedEnd === endDate) {
          setRumHistoryData(data);
          return;
        }
      } catch {
        localStorage.removeItem(cache_key);
      }
    }

    const res = await fetch("/api/rum/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: selectedSite,
        date_from: startDate,
        date_to: endDate,
      }),
    });

    if (!res.ok) {
      console.error(`Error fetching web vital history: ${res.status}`);
      return;
    }

    const data = await res.json();
    setRumHistoryData(data);

    // Overwrites previous cache automatically
    localStorage.setItem(
      cache_key,
      JSON.stringify({ startDate, endDate, data }),
    );
  }

  async function AnalysisHandler() {
    if (activeMetric === "LCP") {
      try {
        setContributors([]);

        const res = await fetch("/api/rum/lcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain_name: selectedSite,
            date_range: "7days",
          }),
        });

        const body = await res.json();

        setContributors(body);
      } catch (error) {
        console.error("Failed to fetch distribution:", error);
      }
    } else if (activeMetric === "CLS") {
      try {
        setContributors([]);

        const res = await fetch("/api/rum/cls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: selectedSite,
            dateFrom: startDate,
            dateTo: endDate,
          }),
        });

        const body = await res.json();

        setContributors(body);
      } catch (error) {
        console.error("Failed to fetch distribution:", error);
      }
    } else if (activeMetric === "INP") {
      try {
        setContributors([]);

        const res = await fetch("/api/rum/inp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain_name: selectedSite,
            date_range: "7days",
          }),
        });

        const body = await res.json();

        setContributors(body);
      } catch (error) {
        console.error("Failed to fetch distribution:", error);
      }
    } else if (activeMetric === "TTFB") {
      try {
        setContributors([]);
        const res = await fetch("/api/rum/ttfb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: selectedSite,
            dateFrom: startDate,
            dateTo: endDate,
          }),
        });

        const body: any = await res.json();

        setContributors(body.TTFBdata);
      } catch (error) {
        console.error("Failed to fetch distribution:", error);
      }
    }
  }

  function winsorize(value: number, min: number, max: number): number {
    //handles bad data or unrealstick bumps
    if (isNaN(value)) return value;
    return Math.min(Math.max(value, min), max);
  }

  async function getDistribution({ startDate, endDate }: getRumHistoryProps) {
    const cache_key = `rum_distributions:${activeMetric} - ${selectedSite}`;
    const cache = localStorage.getItem(cache_key);

    if (cache !== null) {
      const {
        data,
        metric: activeMetric,
        startDate: cachedStartDate,
        endDate: cachedEndDate,
      } = JSON.parse(cache);

      if (
        cachedStartDate === startDate &&
        cachedEndDate === endDate &&
        activeMetric === activeMetric
      ) {
        setRumDistData(data);
        return;
      }
    }

    const res = await fetch("/api/rum/distributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site: selectedSite,
        metric: activeMetric,
        startDate: startDate,
        endDate: endDate,
      }),
    });

    if (!res.ok) {
      console.error(res.statusText);
      return;
    }

    const data = await res.json();
    setRumDistData(data);
    localStorage.setItem(
      cache_key,
      JSON.stringify({ data, activeMetric, startDate, endDate }),
    );
  }
}

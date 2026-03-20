"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSiteContext } from "../../siteContext";
import { cachedData, cleanExpiredCache } from "@/components/utils";
import { MapChart } from "echarts/charts";
import {
  VisualMapComponent,
  GeoComponent,
  TooltipComponent,
  ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import * as echarts from "echarts/core";
import rawWorldMap from "../../../../../../public/maps/worldMap.json";
import { CustomTooltip, DeviceController, useTheme } from "@/components/theme";
import {
  InfoIcon,
  AlertCircle,
  CheckCircle2,
  DatabaseIcon,
  Wifi,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Loader2,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import { alpha3ToAlpha2 } from "@/components/countries/countryCodes";
import { countryNameToAlpha2 } from "@/components/countries/alpha2codes";
import { RealtimeUxMap } from ".";
import TooltipIcon from "@/components/theme/customTooltip";

type UxGranularData = {
  country: string;
  device_type: string;
  network: string;
  total_sessions: number;
  p75_lcp: number;
  p75_ttfb: number;
  p75_cls: number;
  p75_inp: number;
  good_pct: number;
  average_pct: number;
  bad_pct: number;
};

type Window = "Live Traffic" | "Distributions";

echarts.use([
  MapChart,
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
  ToolboxComponent,
]);

const worldEN = rawWorldMap as unknown as any;
worldEN.features = worldEN.features.filter(
  (feature: any) => feature.properties.name !== "Antarctica",
);
echarts.registerMap("world", worldEN);

export default function UxReport() {
  const [userHappinessData, setHappinessData] = useState<UxGranularData[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedSite, selectedDevice } = useSiteContext();
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const [activeWindow, SetActiveWindow] = useState<Window>("Distributions");
  const windows = ["Distributions", "Live Traffic"] as const;

  const [compAIndex, setCompAIndex] = useState<number>(0);
  const [compBIndex, setCompBIndex] = useState<number>(1);

  const { theme } = useTheme();

  const alphacode2toCountry: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(countryNameToAlpha2).map(([country, code]) => [
          code,
          country,
        ]),
      ),
    [],
  );

  useEffect(() => {
    cleanExpiredCache({ prefix: "ux", session_Storage: true });
    fetchUserHappinesGeo();
  }, [selectedSite]);

  // Aggregate data for the Map (weighted average based on sessions)
  const filteredMapData = useMemo(() => {
    const filtered = userHappinessData.filter((x) => {
      const matchDevice = x.device_type === selectedDevice.toLowerCase();
      const matchNetwork =
        selectedNetwork === "all" || x.network === selectedNetwork;
      return matchDevice && matchNetwork;
    });

    // Inside useMemo for filteredMapData
    const aggregated = new Map<string, any>();
    filtered.forEach((item) => {
      const existing = aggregated.get(item.country) || {
        country_iso: item.country,
        total_sessions: 0,
        good_pct: 0,
        average_pct: 0,
        bad_pct: 0,
        p75_lcp: 0,
        p75_ttfb: 0,
        p75_cls: 0, // Added
        p75_inp: 0, // Added
      };
      const weight = item.total_sessions;
      const total = existing.total_sessions + weight;

      aggregated.set(item.country, {
        country_iso: item.country,
        total_sessions: total,
        good_pct:
          (existing.good_pct * existing.total_sessions +
            item.good_pct * weight) /
          total,
        average_pct:
          (existing.average_pct * existing.total_sessions +
            item.average_pct * weight) /
          total,
        bad_pct:
          (existing.bad_pct * existing.total_sessions + item.bad_pct * weight) /
          total,
        p75_lcp:
          (existing.p75_lcp * existing.total_sessions + item.p75_lcp * weight) /
          total,
        p75_ttfb:
          (existing.p75_ttfb * existing.total_sessions +
            item.p75_ttfb * weight) /
          total,
        p75_cls:
          (existing.p75_cls * existing.total_sessions + item.p75_cls * weight) /
          total, // Added
        p75_inp:
          (existing.p75_inp * existing.total_sessions + item.p75_inp * weight) /
          total, // Added
      });
    });
    return Array.from(aggregated.values());
  }, [userHappinessData, selectedDevice, selectedNetwork]);

  const networkTypes = useMemo(
    () => ["all", ...new Set(userHappinessData.map((d) => d.network))],
    [userHappinessData],
  );

  const comparisonData = useMemo(() => {
    const segA = userHappinessData[compAIndex];
    const segB = userHappinessData[compBIndex];
    if (!segA || !segB) return null;

    // For all these metrics, a negative delta (decrease) is a performance improvement
    const calculateDiff = (a: number, b: number) => ((b - a) / (a || 1)) * 100;

    return {
      segA,
      segB,
      lcpDiff: calculateDiff(segA.p75_lcp, segB.p75_lcp),
      inpDiff: calculateDiff(segA.p75_inp, segB.p75_inp),
      ttfbDiff: calculateDiff(segA.p75_ttfb, segB.p75_ttfb),
      clsDiff: calculateDiff(segA.p75_cls, segB.p75_cls),
    };
  }, [userHappinessData, compAIndex, compBIndex]);

  useEffect(() => {
    if (
      activeWindow !== "Distributions" ||
      !chartRef.current ||
      loading ||
      userHappinessData.length === 0
    ) {
      return;
    }

    if (chartInstanceRef.current) chartInstanceRef.current.dispose();
    chartInstanceRef.current = echarts.init(chartRef.current);
    const chart = chartInstanceRef.current;

    const seriesData = worldEN.features.map((feature: any) => {
      const countryCode = alpha3ToAlpha2[feature.id]?.toUpperCase();
      const d = filteredMapData.find((x) => x.country_iso === countryCode);

      return {
        name: feature.properties.name,
        value: d?.total_sessions || 0,
        itemStyle: {
          areaColor: d
            ? getDominantColor(d)
            : theme === "dark"
              ? "#1e1e2e"
              : "#f0f0f0",
        },
        originalData: d || {
          good_pct: 0,
          average_pct: 0,
          bad_pct: 0,
          total_sessions: 0,
          p75_lcp: 0,
          p75_ttfb: 0,
          p75_cls: 0,
          p75_inp: 0,
        },
      };
    });

    chart.setOption({
      tooltip: {
        trigger: "item",
        backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
        borderColor: theme === "dark" ? "#1e293b" : "#e2e8f0",
        padding: 0,
        textStyle: {
          fontFamily: "Inter, sans-serif",
        },
        formatter: (params: any) => {
          if (!params.data || !params.data.originalData.total_sessions)
            return "";

          const {
            good_pct,

            p75_lcp,
            p75_ttfb,
            p75_cls,
            p75_inp,
            total_sessions,
          } = params.data.originalData;

          // Threshold Color Logic
          const getLcpColor = (v: number) =>
            v <= 2500 ? "#22c55e" : v <= 4000 ? "#eab308" : "#ef4444";
          const getTtfbColor = (v: number) =>
            v <= 800 ? "#22c55e" : v <= 1800 ? "#eab308" : "#ef4444";
          const getClsColor = (v: number) =>
            v <= 0.1 ? "#22c55e" : v <= 0.25 ? "#eab308" : "#ef4444";
          const getInpColor = (v: number) =>
            v <= 200 ? "#22c55e" : v <= 500 ? "#eab308" : "#ef4444";
          const happyColor = "#22c55e";
          // good_pct >= 75 ? "#22c55e" : good_pct >= 50 ? "#eab308" : "#ef4444";

          return `
            <div style="min-width: 220px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); border-radius: 8px; overflow: hidden; background: ${theme === "dark" ? "#0f172a" : "#ffffff"}; border: 1px solid ${theme === "dark" ? "#1e293b" : "#e2e8f0"};">
              <div style="background: ${theme === "dark" ? "#1e293b" : "#f8fafc"}; padding: 10px 12px; border-bottom: 1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"};">
                <b style="font-size: 14px; color: ${theme === "dark" ? "#f1f5f9" : "#0f172a"}">${params.name}</b>
                <p style="font-size: 9px; font-weight: 800; color: #64748b;">${total_sessions.toLocaleString()} SESSIONS</p>
              </div>
              <div style="padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 11px; color: #64748b; font-weight: 600;">COMPOSITE HAPPINESS</span>
                  <span style="font-size: 16px; font-weight: 800; color: ${happyColor}">${Math.round(good_pct)}%</span>
                </div>
                <div style="width: 100%; height: 4px; background: ${theme === "dark" ? "#334155" : "#e2e8f0"}; border-radius: 2px; margin-bottom: 12px;">
                  <div style="width: ${good_pct}%; height: 100%; background: ${happyColor}; border-radius: 2px;"></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  <div style="padding: 6px; background: ${theme === "dark" ? "#020617" : "#fff"}; border-radius: 4px; border: 1px solid ${theme === "dark" ? "#1e293b" : "#f1f5f9"}">
                    <div style="font-size: 8px; color: #94a3b8; font-weight: 700;">LCP</div>
                    <div style="font-size: 11px; font-weight: 700; color: ${getLcpColor(p75_lcp)}">${Math.round(p75_lcp)}ms</div>
                  </div>
                  <div style="padding: 6px; background: ${theme === "dark" ? "#020617" : "#fff"}; border-radius: 4px; border: 1px solid ${theme === "dark" ? "#1e293b" : "#f1f5f9"}">
                    <div style="font-size: 8px; color: #94a3b8; font-weight: 700;">INP</div>
                    <div style="font-size: 11px; font-weight: 700; color: ${getInpColor(p75_inp)}">${Math.round(p75_inp)}ms</div>
                  </div>
                  <div style="padding: 6px; background: ${theme === "dark" ? "#020617" : "#fff"}; border-radius: 4px; border: 1px solid ${theme === "dark" ? "#1e293b" : "#f1f5f9"}">
                    <div style="font-size: 8px; color: #94a3b8; font-weight: 700;">TTFB</div>
                    <div style="font-size: 11px; font-weight: 700; color: ${getTtfbColor(p75_ttfb)}">${Math.round(p75_ttfb)}ms</div>
                  </div>
                  <div style="padding: 6px; background: ${theme === "dark" ? "#020617" : "#fff"}; border-radius: 4px; border: 1px solid ${theme === "dark" ? "#1e293b" : "#f1f5f9"}">
                    <div style="font-size: 8px; color: #94a3b8; font-weight: 700;">CLS</div>
                    <div style="font-size: 11px; font-weight: 700; color: ${getClsColor(p75_cls)}">${p75_cls.toFixed(3)}</div>
                  </div>
                </div>
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          name: "User Happiness",
          type: "map",
          map: "world",
          zoom: 1.2,
          roam: false,
          label: { show: false },
          itemStyle: {
            borderColor: theme === "dark" ? "#14142e" : "#BED4CB",
          },
          emphasis: {
            itemStyle: { areaColor: "#A4D8F0B3" },
            label: { show: false },
          },
          data: seriesData,
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) chartInstanceRef.current.dispose();
    };
  }, [filteredMapData, theme, activeWindow, loading]);

  const analysis = useMemo(() => {
    if (filteredMapData.length === 0) return null;
    const topByTraffic = [...filteredMapData].sort(
      (a, b) => b.total_sessions - a.total_sessions,
    );
    return {
      totalSessions: filteredMapData.reduce(
        (acc, curr) => acc + curr.total_sessions,
        0,
      ),
      highTrafficLagging: [...topByTraffic]
        .sort((a, b) => b.bad_pct - a.bad_pct)
        .slice(0, 3),
      highTrafficLeading: [...topByTraffic]
        .sort((a, b) => b.good_pct - a.good_pct)
        .slice(0, 3),
    };
  }, [filteredMapData]);

  async function fetchUserHappinesGeo() {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/rum/analytics/ux-map-data", {
            method: "POST",
            body: JSON.stringify({ domain: selectedSite }),
          });
          const data: any = await res.json();
          return data.data;
        },
        key: `ux-granular:${selectedSite}`,
        session_Storage: true,
        ttl: 5 * 60 * 1000,
      });
      setHappinessData(response || []);
    } finally {
      setLoading(false);
    }
  }

  function getDominantColor(d: any) {
    const { p75_lcp, p75_cls, p75_inp, p75_ttfb } = d;

    if (p75_lcp > 4000 || p75_cls > 0.25 || p75_inp > 500 || p75_ttfb > 1800) {
      return "#ef4444";
    }

    if (p75_lcp > 2500 || p75_cls > 0.1 || p75_inp > 200 || p75_ttfb > 800) {
      return "#eab308";
    }

    return theme === "dark" ? "#22c55e" : "#66cc8f";
  }

  if (loading) return <UxLoadingSkeleton />;

  return (
    <div className="w-full px-4 md:px-0 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-2xl tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              UX Distributions
            </h2>
            <TooltipIcon
              content="Global UX experiements on region based user experience status based on web vitals P75s."
              trigger={
                <InfoIcon
                  size={18}
                  className="rounded-full cursor-pointer text-primary/30 hover:text-primary transition-colors"
                />
              }
              side="right"
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-70">
            P75 Metrics & User Experience Across Globe
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 border rounded-sm border-primary/20 bg-primary/5 px-3 py-1.5 overflow-x-auto scrollbar-none min-h-10.25">
            <Wifi size={16} className="text-primary/60 shrink-0" />
            <div className="flex items-center gap-1">
              {networkTypes.map((net) => (
                <button
                  key={net}
                  onClick={() => setSelectedNetwork(net)}
                  className={`cursor-pointer px-2 py-1 rounded-sm text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                    selectedNetwork === net
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border rounded-sm border-primary/20 bg-primary/10 px-3 py-1.5">
            {windows.map((window) => (
              <button
                className={`cursor-pointer px-2 py-1 rounded-sm ${activeWindow === window ? "bg-primary text-primary-foreground" : ""} text-sm font-medium`}
                onClick={() => SetActiveWindow(window)}
                key={window}
              >
                {window}
              </button>
            ))}
          </div>
          <DeviceController disableAllDevices disableTablet={false} />
        </div>
      </div>

      {activeWindow === "Live Traffic" ? (
        <RealtimeUxMap />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            <div className="order-1 lg:order-2 lg:col-span-5 relative flex flex-col bg-transparent dark:bg-secondary-background overflow-hidden rounded-xl border">
              <div className="absolute top-3 left-1 z-20">
                <CustomTooltip
                  content={
                    <div className="space-y-3">
                      <p>
                        A region turns Red when its P75 metrics fall into the
                        &quot;Poor&quot; category. While low sample sizes can
                        skew data, they are often a leading indicator of CDN
                        Cold Caches. In these areas, infrequent traffic means
                        users are likely hitting your origin server rather than
                        a fast local edge, resulting in degraded performance.
                      </p>
                    </div>
                  }
                  side="bottom"
                  trigger={
                    <Lightbulb
                      size={22}
                      className="ml-3 rounded-full p-1 bg-primary/10 text-primary/80 cursor-pointer fill-amber-300"
                    />
                  }
                />
              </div>
              <div className="absolute top-3 right-3 z-20 hidden md:block">
                <div className="flex items-center gap-2 rounded-full bg-background/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm border shadow-sm">
                  <DatabaseIcon size={16} className="text-primary" />
                  <p>
                    Based on last 7 days data for{" "}
                    <span className="font-semibold text-foreground">
                      {selectedSite}
                    </span>{" "}
                    on{" "}
                    <span className="font-semibold capitalize text-foreground">
                      {selectedDevice}
                    </span>
                    {selectedNetwork !== "all" && (
                      <span className="ml-1 uppercase font-bold text-primary">
                        ({selectedNetwork})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div ref={chartRef} className="relative z-10 w-full min-h-125" />
              <figcaption className="relative z-20 mt-auto border-t px-4 py-3 bg-background/20 backdrop-blur-xs">
                <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Happines</span>{" "}
                  is a composite Core Web Vital score (LCP, CLS, INP).
                  <span className="hidden sm:inline text-[12px] ml-2 opacity-60 uppercase font-bold tracking-tighter">
                    Goal: All metrics in &quot;Good&quot; range.
                  </span>
                </p>
              </figcaption>
            </div>

            <div className="order-2 lg:order-1 lg:col-span-2 border border-primary/20 rounded-xl p-5 bg-primary/3 flex flex-col gap-6">
              {analysis && (
                <>
                  <div className="p-3 rounded-lg bg-background/50 border border-primary/10">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Total Segment Sessions
                    </span>
                    <p className="text-2xl font-bold tracking-tighter text-primary">
                      {analysis.totalSessions.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase text-red-500 flex items-center gap-2">
                      <AlertCircle size={14} /> Attention Needed
                    </h4>
                    {analysis.highTrafficLagging.map((item, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-md bg-red-500/5 border border-red-500/10 text-xs"
                      >
                        <div className="flex justify-between font-bold">
                          <span>{alphacode2toCountry[item.country_iso]}</span>
                          <span className="text-red-500">
                            {Math.round(item.bad_pct)}% Poor
                          </span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-1 uppercase">
                          LCP: {Math.round(item.p75_lcp)}ms
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase text-green-500 flex items-center gap-2">
                      <CheckCircle2 size={14} /> Leading Regions
                    </h4>
                    {analysis.highTrafficLeading.map((item, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-md bg-green-500/5 border border-green-500/10 text-xs"
                      >
                        <div className="flex justify-between font-bold">
                          <span>{alphacode2toCountry[item.country_iso]}</span>
                          <span className="text-green-600">
                            {Math.round(item.good_pct)}% Happy
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Comparison Section */}
          <div className="border border-primary/20 rounded-xl bg-primary/5 p-6 space-y-6">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="text-primary" size={20} />
              <h3 className="font-bold text-lg">Segment Comparison</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* SEGMENT A */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Segment A
                </label>
                <div className="relative">
                  <select
                    value={compAIndex}
                    onChange={(e) => setCompAIndex(Number(e.target.value))}
                    className="w-full appearance-none bg-background border border-primary/20 rounded-md p-2 pr-10 text-xs font-medium cursor-pointer transition-all hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {userHappinessData.map((d, i) => (
                      <option key={i} value={i}>
                        {alphacode2toCountry[d.country] || d.country} —{" "}
                        {d.device_type} ({d.network})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground opacity-70"
                  />
                </div>
              </div>

              {/* ICON SEPARATOR */}
              <div className="flex justify-center pt-4 md:pt-6">
                <div className="p-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <ArrowRightLeft size={16} />
                </div>
              </div>

              {/* SEGMENT B */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Segment B
                </label>
                <div className="relative">
                  <select
                    value={compBIndex} // FIXED: Use compBIndex
                    onChange={(e) => setCompBIndex(Number(e.target.value))} // FIXED: Use setCompBIndex
                    className="w-full appearance-none bg-background border border-primary/20 rounded-md p-2 pr-10 text-xs font-medium cursor-pointer transition-all hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {userHappinessData.map((d, i) => (
                      <option key={i} value={i}>
                        {alphacode2toCountry[d.country] || d.country} —{" "}
                        {d.device_type} ({d.network})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground opacity-70"
                  />
                </div>
              </div>
            </div>

            {comparisonData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-4">
                <ComparisonCard
                  label="LCP Delta"
                  value={`${Math.abs(Math.round(comparisonData.lcpDiff))}%`}
                  trend={comparisonData.lcpDiff > 0 ? "down" : "up"}
                  sub={`${Math.round(comparisonData.segB.p75_lcp)}ms vs ${Math.round(comparisonData.segA.p75_lcp)}ms`}
                />
                <ComparisonCard
                  label="INP Delta"
                  value={`${Math.abs(Math.round(comparisonData.inpDiff))}%`}
                  trend={comparisonData.inpDiff > 0 ? "down" : "up"}
                  sub={`${Math.round(comparisonData.segB.p75_inp)}ms vs ${Math.round(comparisonData.segA.p75_inp)}ms`}
                />
                <ComparisonCard
                  label="TTFB Delta"
                  value={`${Math.abs(Math.round(comparisonData.ttfbDiff))}%`}
                  trend={comparisonData.ttfbDiff > 0 ? "down" : "up"}
                  sub={`${Math.round(comparisonData.segB.p75_ttfb)}ms vs ${Math.round(comparisonData.segA.p75_ttfb)}ms`}
                />
                <ComparisonCard
                  label="CLS Delta"
                  value={`${Math.abs(Math.round(comparisonData.clsDiff))}%`}
                  trend={comparisonData.clsDiff > 0 ? "down" : "up"}
                  sub={`${comparisonData.segB.p75_cls?.toFixed(3)} vs ${comparisonData.segA.p75_cls?.toFixed(3)}`}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ComparisonCard({
  label,
  value,
  trend,
  sub,
}: {
  label: string;
  value: string;
  trend: "up" | "down";
  sub: string;
}) {
  return (
    <div className="bg-background/40 border border-primary/10 rounded-lg p-4 flex flex-col items-center text-center transition-all hover:border-primary/30">
      <span className="text-[10px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
        {label}
      </span>
      <div
        className={`flex items-center gap-2 text-2xl font-black ${
          trend === "up" ? "text-green-500" : "text-red-500"
        }`}
      >
        {/* Trend 'up' means performance improved (value decreased) */}
        {trend === "up" ? (
          <TrendingUp size={22} className="shrink-0" />
        ) : (
          <TrendingDown size={22} className="shrink-0" />
        )}
        {value}
      </div>
      <span className="text-[9px] mt-2 text-muted-foreground font-semibold bg-primary/5 px-2 py-0.5 rounded-full border border-primary/5">
        {sub}
      </span>
    </div>
  );
}

function UxLoadingSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse px-4 md:px-0">
      <div className="h-16 bg-primary/5 rounded-xl border border-primary/10 flex items-center px-6 justify-between">
        <div className="h-4 w-48 bg-primary/10 rounded" />
        <div className="h-8 w-32 bg-primary/10 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <div className="lg:col-span-5 h-125 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary/20" size={40} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="h-24 bg-primary/5 rounded-xl border border-primary/10" />
          <div className="h-64 bg-primary/5 rounded-xl border border-primary/10" />
        </div>
      </div>
    </div>
  );
}

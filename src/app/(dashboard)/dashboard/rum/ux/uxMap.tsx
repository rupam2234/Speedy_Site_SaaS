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
import { InfoIcon, DatabaseIcon, Wifi, Lightbulb } from "lucide-react";
import { alpha3ToAlpha2 } from "@/components/countries/countryCodes";
import { countryNameToAlpha2 } from "@/components/countries/alpha2codes";
import {
  getDominantColor,
  RealtimeUxMap,
  UxGranularData,
  UxLoadingSkeleton,
} from ".";
import TooltipIcon from "@/components/theme/customTooltip";
import { ComparisonMain } from ".";

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

  const filteredMapData = useMemo(() => {
    const filtered = userHappinessData.filter((x) => {
      const matchDevice = x.device_type === selectedDevice.toLowerCase();
      const currentNetwork = x.network ?? "WiFi";
      const matchNetwork =
        selectedNetwork === "all" || currentNetwork === selectedNetwork;
      return matchDevice && matchNetwork;
    });

    const aggregated = new Map<string, any>();
    filtered.forEach((item) => {
      const existing = aggregated.get(item.country) || {
        country_iso: item.country,
        total_sessions: 0,
        p75_lcp: 0,
        p75_ttfb: 0,
        p75_cls: 0,
        p75_inp: 0,
      };

      const weight = item.total_sessions;
      const total = existing.total_sessions + weight;

      aggregated.set(item.country, {
        country_iso: item.country,
        total_sessions: total,
        p75_lcp:
          (existing.p75_lcp * existing.total_sessions + item.p75_lcp * weight) /
          total,
        p75_ttfb:
          (existing.p75_ttfb * existing.total_sessions +
            item.p75_ttfb * weight) /
          total,
        p75_cls:
          (existing.p75_cls * existing.total_sessions + item.p75_cls * weight) /
          total,
        p75_inp:
          (existing.p75_inp * existing.total_sessions + item.p75_inp * weight) /
          total,
      });
    });

    return Array.from(aggregated.values());
  }, [userHappinessData, selectedDevice, selectedNetwork]);

  const networkTypes = useMemo(
    () => [
      "all",
      ...new Set(userHappinessData.map((d) => d.network ?? "WiFi")),
    ],
    [userHappinessData],
  );

  const comparisonData = useMemo(() => {
    const segA = userHappinessData[compAIndex];
    const segB = userHappinessData[compBIndex];
    if (!segA || !segB) return null;

    // If B is 2000 and A is 4000: ((2000-4000)/4000) = -0.5 (-50%)
    // A negative percentage in Web Vitals is an IMPROVEMENT.
    const percentDiffFromA = (a: number, b: number) => {
      if (!a || a === 0) return 0;
      return ((b - a) / a) * 100;
    };

    return {
      segA,
      segB,
      lcpDiff: percentDiffFromA(segA.p75_lcp, segB.p75_lcp),
      inpDiff: percentDiffFromA(segA.p75_inp, segB.p75_inp),
      ttfbDiff: percentDiffFromA(segA.p75_ttfb, segB.p75_ttfb),
      clsDiff: percentDiffFromA(segA.p75_cls, segB.p75_cls),
    };
  }, [userHappinessData, compAIndex, compBIndex]);

  useEffect(() => {
    if (
      activeWindow !== "Distributions" ||
      !chartRef.current ||
      loading ||
      userHappinessData.length === 0
    )
      return;

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
            ? getDominantColor(d, theme)
            : theme === "dark"
              ? "#1e1e2e"
              : "#f0f0f0",
        },
        originalData: d,
      };
    });

    chart.setOption({
      tooltip: {
        trigger: "item",
        backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
        borderColor: theme === "dark" ? "#1e293b" : "#e2e8f0",
        padding: 0,
        textStyle: { fontFamily: "Inter, sans-serif" },
        formatter: (params: any) => {
          if (!params.data || !params.data.originalData) return "";
          const d = params.data.originalData;
          const getCol = (v: number, g: number, p: number) =>
            v <= g ? "#22c55e" : v <= p ? "#eab308" : "#ef4444";

          return `
            <div style="min-width: 200px; border-radius: 8px; overflow: hidden; background: ${theme === "dark" ? "#0f172a" : "#fff"}; border: 1px solid ${theme === "dark" ? "#1e293b" : "#e2e8f0"};">
              <div style="padding: 10px; background: ${theme === "dark" ? "#1e293b" : "#f8fafc"}; border-bottom: 1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"};">
                <b style="font-size: 13px;">${params.name}</b>
                <div style="font-size: 9px; color: #64748b; font-weight: bold;">${d.total_sessions.toLocaleString()} SESSIONS</div>
              </div>
              <div style="padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div><div style="font-size: 8px; color: #94a3b8; font-weight: 700;">LCP</div><div style="font-size: 11px; font-weight: 700; color: ${getCol(d.p75_lcp, 2500, 4000)}">${Math.round(d.p75_lcp)}ms</div></div>
                <div><div style="font-size: 8px; color: #94a3b8; font-weight: 700;">INP</div><div style="font-size: 11px; font-weight: 700; color: ${getCol(d.p75_inp, 200, 500)}">${Math.round(d.p75_inp)}ms</div></div>
                <div><div style="font-size: 8px; color: #94a3b8; font-weight: 700;">TTFB</div><div style="font-size: 11px; font-weight: 700; color: ${getCol(d.p75_ttfb, 800, 1800)}">${Math.round(d.p75_ttfb)}ms</div></div>
                <div><div style="font-size: 8px; color: #94a3b8; font-weight: 700;">CLS</div><div style="font-size: 11px; font-weight: 700; color: ${getCol(d.p75_cls, 0.1, 0.25)}">${d.p75_cls.toFixed(3)}</div></div>
              </div>
            </div>`;
        },
      },
      series: [
        {
          type: "map",
          map: "world",
          zoom: 1.2,
          roam: false,
          label: { show: false },
          itemStyle: { borderColor: theme === "dark" ? "#14142e" : "#BED4CB" },
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

    // Sort by session volume to focus on what impacts the most users
    const topRegions = [...filteredMapData]
      .sort((a, b) => b.total_sessions - a.total_sessions)
      .slice(0, 5)
      .map((region) => {
        // Find the "Worst" metric for this specific region to show as a bottleneck
        const metrics = [
          { name: "LCP", val: region.p75_lcp, limit: 2500 },
          { name: "INP", val: region.p75_inp, limit: 200 },
          { name: "TTFB", val: region.p75_ttfb, limit: 800 },
          { name: "CLS", val: region.p75_cls, limit: 0.1 },
        ];
        const bottleneck = metrics.reduce((prev, curr) =>
          curr.val / curr.limit > prev.val / prev.limit ? curr : prev,
        );

        return { ...region, bottleneck };
      });

    return {
      totalSessions: filteredMapData.reduce(
        (acc, curr) => acc + curr.total_sessions,
        0,
      ),
      topRegions,
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
        ttl: 60 * 60 * 1000,
      });
      setHappinessData(response || []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <UxLoadingSkeleton />;

  return (
    <div className="w-full px-4 md:px-0 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-2xl tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              UX Map
            </h2>
            <TooltipIcon
              content="Representation of the weekly p75 user experience for the active website across global regions, weighted by traffic distribution."
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
            P75 Metrics Across Globe
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
                  className={`cursor-pointer px-2 py-1 rounded-sm text-[10px] font-bold uppercase transition-all whitespace-nowrap ${selectedNetwork === net ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 border rounded-sm border-primary/20 bg-primary/10 px-3 py-1.5">
            {windows.map((window) => (
              <button
                key={window}
                className={`cursor-pointer px-2 py-1 rounded-sm ${activeWindow === window ? "bg-primary text-primary-foreground" : ""} text-sm font-medium`}
                onClick={() => SetActiveWindow(window)}
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
                        skew data, they could also be a leading indicator of CDN
                        Cold Caches (in case the site has a CDN).
                      </p>
                      <p>
                        Higher green regions accross the globe often results in
                        good aggregate web vitals or atleast upcoming web vitals
                        likely to be on safer side.
                      </p>
                    </div>
                  }
                  side="bottom"
                  trigger={
                    <Lightbulb
                      size={22}
                      className="ml-3 rounded-full p-1 bg-primary/10 text-primary cursor-pointer fill-amber-300"
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

              <div
                ref={chartRef}
                className="relative z-10 mt-10 w-full min-h-125"
              />
              <figcaption className="relative z-20 mt-auto border-t px-4 py-3 bg-background/20 backdrop-blur-xs">
                <p className="text-xs text-muted-foreground">
                  Color indicates metric health based on the <b>weakest link</b>{" "}
                  among Core Web Vitals.
                </p>
              </figcaption>
            </div>

            <div className="order-2 lg:order-1 lg:col-span-2 border border-primary/20 rounded-xl p-5 bg-primary/3 flex flex-col gap-6">
              {analysis && (
                <>
                  <div className="p-3 rounded-lg bg-background/50 border border-primary/10">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Sample Sessions
                    </span>
                    <p className="text-2xl font-bold tracking-tighter text-primary">
                      {analysis.totalSessions.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                        Top Regions by Traffic
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {analysis.topRegions.map((item, i) => {
                        const isPoor =
                          item.bottleneck.val > item.bottleneck.limit;

                        return (
                          <div
                            key={i}
                            className="p-3 rounded-md bg-background/40 border border-primary/5 hover:border-primary/20 transition-all"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-sm">
                                {alphacode2toCountry[item.country_iso] ||
                                  item.country_iso}
                              </span>
                              <span className="text-[10px] font-medium opacity-60">
                                {(
                                  (item.total_sessions /
                                    analysis.totalSessions) *
                                  100
                                ).toFixed(1)}
                                % traffic
                              </span>
                            </div>

                            {/* Health Bar */}
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                              <div
                                className={`h-full transition-all ${isPoor ? "bg-red-500" : "bg-green-500"}`}
                                style={{
                                  width: `${Math.min((item.bottleneck.limit / item.bottleneck.val) * 100, 100)}%`,
                                }}
                              />
                            </div>

                            <div className="flex justify-between mt-2">
                              <span
                                className={`text-[9px] uppercase font-bold ${isPoor ? "text-red-500" : "text-green-600"}`}
                              >
                                {isPoor
                                  ? `Slow ${item.bottleneck.name}`
                                  : "Healthy"}
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground">
                                {item.total_sessions.toLocaleString()} sess
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-auto p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-[10px] leading-relaxed text-muted-foreground italic">
                      Tip: Focus on regions with high traffic percentages and
                      &quot;Slow&quot; labels to maximize ROI on optimizations.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <ComparisonMain
            alphacode2toCountry={alphacode2toCountry}
            compAIndex={compAIndex}
            compBIndex={compBIndex}
            comparisonData={comparisonData}
            userHappinessData={userHappinessData}
            setCompAIndex={setCompAIndex}
            setCompBIndex={setCompBIndex}
          />
        </>
      )}
    </div>
  );
}

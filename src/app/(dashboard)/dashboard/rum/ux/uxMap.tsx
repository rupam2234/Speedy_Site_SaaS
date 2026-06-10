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
import {
  CustomTooltip,
  DeviceController,
  Title,
  useTheme,
} from "@/components/theme";
import { DatabaseIcon, Wifi, Lightbulb } from "lucide-react";
import { alpha3ToAlpha2 } from "@/components/countries/countryCodes";
import {
  Compare,
  getDominantColor,
  RealtimeUxMap,
  UxGranularData,
  UxLoadingSkeleton,
} from ".";

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

  const { theme } = useTheme();

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

  useEffect(() => {
    if (activeWindow !== "Distributions" || !chartRef.current || loading)
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
              <div style="padding: 10px; color: ${theme === "dark" ? "#f8fafc" : "#1e293b"}; border-bottom: 1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"};">
                <b style="font-size: 13px; ${theme === "dark" ? "#1e293b" : "#f8fafc"}">${params.name}</b>
                <div style="font-size: 9px; color: #64748b; font-weight: bold;">${d.total_sessions.toLocaleString()} SESSIONS <span>(${(
                  (d.total_sessions / analysis?.totalSessions) *
                  100
                ).toFixed(0)}% of sample sessions)<span/></div>
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
        userHappinessData.length > 0
          ? {
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
            }
          : {
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
              data: [],
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
        <Title
          title="Global User Experience"
          description="Based on the 75th percentile of users"
          tooltip={
            "Shows the weekly 75th-percentile user experience for the active website across global regions, weighted by traffic distribution."
          }
        />

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
            <div className="order-1 lg:order-2 lg:col-span-5 relative flex flex-col bg-transparent dark:bg-secondary-background overflow-hidden rounded-sm border">
              <div className="absolute top-3 left-1 z-20">
                <CustomTooltip
                  content={
                    <div className="space-y-3">
                      <p>
                        Web Vitals data is collected from real users worldwide.
                        As a result, visitors from regions outside your primary
                        target region can still influence your overall Web
                        Vitals performance.
                      </p>

                      <p>
                        A region is marked{" "}
                        <span className="text-red-400">Red</span> when its
                        metrics fall into the <strong>Poor</strong> category,
                        and <span className="text-yellow-400">Yellow</span> when
                        metrics are classified as{" "}
                        <strong>Needs Improvement</strong>.
                      </p>

                      <p>
                        Consistently green regions across the globe typically
                        indicate strong CDN coverage, lower latency, and faster
                        server response times. While low sample sizes can
                        occasionally skew results, poor regional performance is
                        often a sign of genuine Web Vitals issues or CDN cache
                        misses and cold-cache behavior.
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
                <p className="text-sm text-muted-foreground">
                  Color indicates metric health based on the <b>weakest link</b>{" "}
                  among Core Web Vitals.
                </p>
              </figcaption>
            </div>

            <div className="order-2 lg:order-1 lg:col-span-2 rounded-sm flex flex-col gap-3">
              <Compare uxData={userHappinessData ? userHappinessData : []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

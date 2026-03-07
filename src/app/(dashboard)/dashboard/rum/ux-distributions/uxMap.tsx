"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSiteContext } from "../../siteContext";
import { cachedData } from "@/components/utils";
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
  Users,
  Activity,
  DatabaseIcon,
} from "lucide-react";
import { alpha3ToAlpha2 } from "@/components/countries/countryCodes";
import { countryNameToAlpha2 } from "@/components/countries/alpha2codes";

type HappinessData = {
  country_iso: string;
  device_type: string;
  happy_percentage: number;
  moderate_percentage: number;
  unhappy_percentage: number;
  total_sessions: number;
};

echarts.use([
  MapChart,
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
  ToolboxComponent,
]);

const worldEN = rawWorldMap as unknown as any;

// Remove Antarctica from GeoJSON
worldEN.features = worldEN.features.filter(
  (feature: any) => feature.properties.name !== "Antarctica",
);

echarts.registerMap("world", worldEN);

export default function UxReport() {
  const [userHappinessData, setHappinessData] = useState<HappinessData[]>([]);
  const { selectedSite, selectedDevice } = useSiteContext();

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const filteredData: HappinessData[] = userHappinessData.filter(
    (x) => x.device_type === selectedDevice.toLowerCase(),
  );

  const { theme } = useTheme();

  useEffect(() => {
    fetchUserHappinesGeo();
  }, [selectedSite]);

  useEffect(() => {
    if (!chartRef.current || userHappinessData.length === 0) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    const seriesData = worldEN.features.map((feature: any) => {
      const countryName = feature.properties.name;
      const countryCode = alpha3ToAlpha2[feature.id]?.toUpperCase() || null;

      const d = filteredData.find((x) => x.country_iso === countryCode);

      return {
        name: countryName,
        value: d?.total_sessions || 0,
        itemStyle: {
          areaColor: d
            ? getDominantColor(d)
            : theme === "dark"
              ? "#6ca3cc"
              : "#f0f0f0",
        },
        originalData: d || {
          happy_percentage: 0,
          moderate_percentage: 0,
          unhappy_percentage: 0,
          total_sessions: 0,
        },
      };
    });

    const option: echarts.EChartsCoreOption = {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          if (!params.data) return params.name;
          const {
            happy_percentage,
            moderate_percentage,
            unhappy_percentage,
            total_sessions,
          } = params.data.originalData;
          return `
            <div style="font-family: sans-serif;">
              <b>${params.name}</b><br/>
              <span style="color: #28a745">●</span> Happy ux: ${happy_percentage}%<br/>
              <span style="color: #fd7e14">●</span> Moderate ux: ${moderate_percentage}%<br/>
              <span style="color: #dc3545">●</span> Unhappy ux: ${unhappy_percentage}%<br/>
              <hr style="margin: 5px 0"/>
              Sessions: ${total_sessions.toLocaleString()}
            </div>
          `;
        },
      },
      series: [
        {
          name: "User Happiness",
          type: "map",
          map: "world",
          roam: false,
          label: { show: false },
          itemStyle: {
            borderColor: theme === "dark" ? "#14142e" : "#BED4CB",
            areaColor: undefined,
          },
          emphasis: {
            label: { show: false },
            itemStyle: {
              areaColor: undefined,
              borderColor: "#BED4CB",
            },
          },
          data: seriesData,
        },
      ],
      toolbox: {
        show: true,
        top: 4,
        left: 4,
        feature: {
          saveAsImage: {},
        },
      },
    };

    chart.setOption(option, { lazyUpdate: true, notMerge: true });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [filteredData, theme, selectedDevice]);

  const analysis = useMemo(() => {
    if (filteredData?.length === 0) return null;

    const totalSessions = filteredData.reduce(
      (acc, curr) => acc + curr.total_sessions,
      0,
    );

    // Sort by session volume to find high-traffic regions first
    const topByTraffic = [...filteredData].sort(
      (a, b) => b.total_sessions - a.total_sessions,
    );

    // Take the top 10 highest traffic regions to analyze for leading/lagging
    const highTrafficPool = topByTraffic.slice(0, 10);

    // From high traffic pool: who is performing best?
    const highTrafficLeading = [...highTrafficPool]
      .sort((a, b) => b.happy_percentage - a.happy_percentage)
      .slice(0, 3);

    // From high traffic pool: who is performing worst? (Problem Areas)
    const highTrafficLagging = [...highTrafficPool]
      .sort((a, b) => b.unhappy_percentage - a.unhappy_percentage)
      .slice(0, 3);

    return {
      totalSessions,
      highTrafficLeading,
      highTrafficLagging,
      countryCount: filteredData.length,
    };
  }, [filteredData]);

  const alphacode2toCountry: Record<string, string> = Object.fromEntries(
    Object.entries(countryNameToAlpha2).map(([country, code]) => [
      code,
      country,
    ]),
  );

  return (
    <>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center mb-6 justify-between w-full group">
          <div className="flex items-center gap-4">
            <Activity size={34} className="text-primary/80" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl tracking-tighter bg-linear-to-br from-primary via-primary to-primary/50 bg-clip-text text-transparent">
                  UX Distributions
                </h2>
                <CustomTooltip
                  content="We start with global UX because it shows you current status of user experience on your site based on real user web vitals. Region based UX report quickly exposes your worst performing regions and gives you a idea where to start fixing. UX differences are strongly linked with web vitals and CDN / cache effectiveness. Bad web vitals or lack of edge cache often leads region experiencing bad user experience."
                  trigger={
                    <div className="p-1 rounded-full hover:bg-primary/10 transition-colors cursor-help">
                      <InfoIcon
                        size={16}
                        className="text-primary/40 hover:text-primary/80"
                      />
                    </div>
                  }
                  side="right"
                  maxWidth="400px"
                />
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest opacity-80">
                Page Speed Impact & User Experience Across Globe
              </p>
            </div>
          </div>
          <DeviceController disableAllDevices disableTablet={false} />
        </div>

        <div className="grid grid-cols-7 gap-4">
          {/* Analysis Sidebar (Left) */}
          <div className="col-span-2 border border-primary/20 rounded-xl p-5 bg-primary/3 flex flex-col gap-6">
            {!analysis ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <p className="text-xs font-medium italic">
                  Calculating regional impact...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Global Stats Summary */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 rounded-lg bg-background/50 border border-primary/10">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Users size={12} className="text-primary/60" />
                      <span className="text-[10px] uppercase font-bold tracking-tight">
                        Sample Sessions
                      </span>
                    </div>
                    <p className="text-xl font-bold tracking-tighter text-primary">
                      {analysis.totalSessions.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* High Traffic Problem Areas (Lagging) */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase text-red-500/80 flex items-center gap-2 tracking-widest">
                    <AlertCircle size={14} /> Attention Needed
                  </h4>
                  <p className="text-[10px] text-muted-foreground leading-tight italic">
                    High-volume regions with significant poor experience:
                  </p>
                  <div className="space-y-2">
                    {analysis.highTrafficLagging.map((item, i) => (
                      <div
                        key={i}
                        className="flex flex-col p-2 rounded-md bg-red-500/5 border border-red-500/10"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs">
                            {alphacode2toCountry[item.country_iso]}
                          </span>
                          <span className="text-red-500 font-bold text-xs">
                            {item.unhappy_percentage}% Unhappy
                          </span>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-semibold">
                          <span>
                            Volume: {item.total_sessions.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* High Traffic Success (Leading) */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase text-green-500/80 flex items-center gap-2 tracking-widest">
                    <CheckCircle2 size={14} /> Leading Regions
                  </h4>
                  <div className="space-y-2">
                    {analysis.highTrafficLeading.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-xs p-2 rounded-md bg-green-500/5 border border-green-500/10"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold">
                            {alphacode2toCountry[item.country_iso]}
                          </span>
                          <span className="text-[9px] text-muted-foreground uppercase">
                            {item.total_sessions.toLocaleString()} sessions
                          </span>
                        </div>
                        <span className="text-green-600 font-bold">
                          {item.happy_percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-primary/10">
                  <p className="text-[9px] leading-relaxed text-muted-foreground/70 italic">
                    * Analysis prioritized by traffic volume to identify where
                    optimizations will have the largest global impact.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Map Chart (Right) */}
          <div className="col-span-5 relative flex flex-col bg-transparent dark:bg-secondary-background overflow-hidden rounded-xl border">
            <div className="absolute top-3 right-3 z-20 hidden md:block">
              <div className="flex items-center gap-2 rounded-full bg-background/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm border shadow-sm">
                <DatabaseIcon size={16} className="text-primary" />
                <p>
                  Weekly geographical UX data for{" "}
                  <span className="font-semibold text-foreground">
                    {selectedSite}
                  </span>{" "}
                  on{" "}
                  <span className="font-semibold capitalize text-foreground">
                    {selectedDevice.toLowerCase()}
                  </span>
                </p>
              </div>
            </div>

            <div className="absolute z-0 pointer-events-none" />
            <div
              ref={chartRef}
              className="relative z-10 w-full min-h-100 lg:min-h-140"
            />
            <figcaption className="relative z-20 mt-auto border-t px-4 py-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  &quot;Happiness&quot;
                </span>{" "}
                is an aggregate measure of{" "}
                <strong className="text-foreground">Core Web Vitals</strong>.
                When vitals are optimal, we define the experience as
                &quot;happy.&quot; Improving
                <strong className="text-foreground">
                  {" "}
                  Web Vital issues and CDN{" "}
                </strong>
                configurations will boost performance across global regions in
                real-time.
              </p>
            </figcaption>
          </div>
        </div>
      </div>
    </>
  );

  async function fetchUserHappinesGeo() {
    if (!selectedSite) return;

    const key = `ux:${selectedSite}`;

    const { response } = await cachedData({
      fn: getUxData,
      key: key,
      session_Storage: true,
      ttl: 5 * 60 * 1000,
    });

    async function getUxData() {
      const res = await fetch("/api/rum/analytics/happiness-geo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: selectedSite,
        }),
      });

      const data: any = await res.json();

      if (!res.ok) {
        throw new Error(data?.message ?? "failed to fetch UX data");
      }

      return data.data;
    }

    setHappinessData(response);
  }

  /**
   * get the dominant UX happiness for a certain region
   * @param d UX data
   * @returns color for regions
   */
  function getDominantColor(d: HappinessData) {
    const { happy_percentage, moderate_percentage, unhappy_percentage } = d;
    if (
      happy_percentage >= moderate_percentage &&
      happy_percentage >= unhappy_percentage
    ) {
      return theme === "dark"
        ? "#53a94a"
        : theme === "light"
          ? "#66cc8f"
          : "#66cc8f"; // green
    } else if (
      moderate_percentage >= happy_percentage &&
      moderate_percentage >= unhappy_percentage
    ) {
      return "#FFEEA9"; // yellow
    } else {
      return "#FF9898"; // red
    }
  }
}

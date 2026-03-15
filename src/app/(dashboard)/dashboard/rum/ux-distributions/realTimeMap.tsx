"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { MapChart, EffectScatterChart } from "echarts/charts";
import {
  VisualMapComponent,
  GeoComponent,
  TooltipComponent,
  ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import * as echarts from "echarts/core";
import rawWorldMap from "../../../../../../public/maps/worldMap.json";
import { useTheme } from "@/components/theme";
import { cwv_ranges } from "../cwvRanges";

echarts.use([
  MapChart,
  EffectScatterChart,
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

interface RealtimeVisitor {
  id: string;
  session: string;
  country: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  domain: string;
  currentPage: string;
  previousPage: string;
  device: string;
  TTFB?: number;
  CLS?: number;
  LCP?: number;
  INP?: number;
}

export default function RealtimeUxMap() {
  const { selectedSite } = useSiteContext();
  const { theme } = useTheme();

  const [visitors, setVisitors] = useState<RealtimeVisitor[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [activeUsers, setActiveUsers] = useState<number>(0);

  const getVitalsColor = (v: RealtimeVisitor) => {
    if (!v.LCP || !v.CLS || !v.INP || !v.TTFB) return "#3b82f6"; // Default blue
    if (
      v.LCP > cwv_ranges.lcp[1] ||
      v.CLS > cwv_ranges.cls[1] ||
      v.INP > cwv_ranges.inp[1]
    )
      return "#ef4444"; // Red (Poor)
    if (
      v.LCP > cwv_ranges.lcp[0] ||
      v.CLS > cwv_ranges.cls[0] ||
      v.INP > cwv_ranges.inp[0]
    )
      return "#f59e0b"; // Yellow (Average)
    return "#22c55e"; // Green (Good)
  };

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    //Prepare data with colors based on metrics
    const scatterData = visitors.map((v) => ({
      name: `${v.city}, ${v.country}`,
      activeDevice: v.device,
      value: [v.longitude, v.latitude, 1],
      itemStyle: { color: getVitalsColor(v) }, // Individual dot color
      metrics: {
        ttfb: v.TTFB?.toFixed(0),
        lcp: v.LCP?.toFixed(0),
        cls: v.CLS?.toFixed(3),
        inp: v.INP?.toFixed(0),
      },
    }));

    const option: echarts.EChartsCoreOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: theme === "dark" ? "#1a1a2e" : "#ffffff",
        borderColor: "rgba(255,255,255,0.1)",
        textStyle: { color: theme === "dark" ? "#fff" : "#000" },
        formatter: (params: any) => {
          const m = params.data.metrics;
          return `
            <div style="padding: 4px">
              <b style="font-size: 14px">${params.name}</b><br/>
              <span style="font-size: 11px">Device: ${params.data.activeDevice}</span>
            <div style="margin-top: 8px; display: grid; gap: 4px; font-size: 11px; font-family: monospace">
                <span>TTFB: <b style="color: ${params.color}">${m.ttfb ?? "n/a"} ms</b></span>
                <span>LCP: <b style="color: ${params.color}">${m.lcp ?? "n/a"} ms</b></span>
                <span>INP: <b style="color: ${params.color}">${m.inp ?? "n/a"} ms</b></span>
                <span>CLS: <b style="color: ${params.color}">${m.cls ?? "n/a"}</b></span>
              </div>
            </div>
          `;
        },
      },
      geo: {
        map: "world",
        roam: false,
        zoom: 1.2,
        label: { show: false },
        itemStyle: {
          areaColor: theme === "dark" ? "#1a1a3a" : "#f0f0f0",
          borderColor: theme === "dark" ? "#2a2a4a" : "#BED4CB",
        },
        emphasis: {
          label: { show: false },
        },
      },
      series: [
        {
          name: "Real-time Pulse",
          type: "effectScatter",
          coordinateSystem: "geo",
          data: scatterData,
          symbolSize: 12,
          showEffectOn: "render",
          rippleEffect: {
            brushType: "stroke",
            scale: 3,
            period: 4,
          },
          label: { show: false },
          zlevel: 1,
        },
      ],
    };

    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);
    return () => resizeObserver.disconnect();
  }, [visitors, theme]);

  useEffect(() => {
    const socket = new WebSocket(
      "wss://event-buffer.thespeedysite.workers.dev/realtime",
    );

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "visitor" && data.domain === selectedSite) {
          // Fallback ID if worker doesn't send one
          const visitorId = data.id || Math.random().toString(36).substr(2, 9);

          const newVisitor: RealtimeVisitor = {
            ...data,
            id: visitorId,
            // Ensure coordinates exist before parsing
            latitude: data.latitude ? parseFloat(data.latitude) : 0,
            longitude: data.longitude ? parseFloat(data.longitude) : 0,
          };

          setVisitors((prev) => {
            // Check for duplicates to prevent "double pulsing"
            if (prev.find((v) => v.id === newVisitor.id)) return prev;

            const filtered = prev.filter(
              (v) => Date.now() - v.timestamp < 60000,
            );
            return [...filtered, newVisitor];
          });

          // Auto-remove after 60 seconds
          setTimeout(() => {
            setVisitors((prev) => prev.filter((v) => v.id !== visitorId));
          }, 60000);
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    return () => socket.close();
  }, [selectedSite]);

  useEffect(() => {
    const uniqueUsers = new Set<string>();

    for (let i = 0; i < visitors.length; i++) {
      uniqueUsers.add(visitors[i].session);
    }

    setActiveUsers(uniqueUsers.size);
  }, [visitors]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-2 border border-primary/20 rounded-xl p-5 bg-primary/3 flex flex-col gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-primary/10 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                Active Users
              </span>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold font-mono">
                  {activeUsers}
                </span>
              </div>
            </div>

            {/* Performance Legend */}
            <div className="flex gap-4 items-center py-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[9px] font-bold uppercase text-muted-foreground">
                  Fast
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[9px] font-bold uppercase text-muted-foreground">
                  Avg
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[9px] font-bold uppercase text-muted-foreground">
                  Slow
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[9px] font-bold uppercase text-muted-foreground">
                  Insufficient Data
                </span>
              </div>
            </div>

            {/* Live Feed of Recent metrics */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Latest Pulses
              </h4>
              <div className="space-y-2 max-h-75 overflow-hidden">
                {visitors.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground/50 py-4">
                    Waiting for data...
                  </p>
                ) : (
                  [...visitors]
                    .reverse()
                    .slice(0, 8)
                    .map((v) => (
                      <div
                        key={v.id}
                        className="flex flex-col p-2 rounded-md bg-background/40 border border-primary/5 animate-in fade-in slide-in-from-right-2"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-bold truncate">
                            {v.city}, {v.country}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {new Date(v.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="space-y-2 text-[10px] font-mono max-w-full">
                          <div className="font-medium text-primary/80 truncate">
                            current page:{" "}
                            {v.currentPage === "/"
                              ? "home page"
                              : v.currentPage}
                          </div>
                          <div className="font-medium text-primary/80 leading-1">
                            coming from: {v.previousPage}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-5 relative flex flex-col bg-transparent dark:bg-secondary-background overflow-hidden rounded-xl border min-h-100">
          <div className="absolute top-3 right-3 z-20 hidden md:block">
            <div className="flex items-center gap-2 rounded-full bg-background/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm border shadow-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <p>
                Live Feed:{" "}
                <span className="font-bold text-foreground">
                  {selectedSite}
                </span>
              </p>
            </div>
          </div>

          <div
            ref={chartRef}
            className="relative z-10 w-full min-h-75 md:min-h-100 lg:min-h-140"
          />

          <figcaption className="border-t px-4 py-3 bg-background/20 backdrop-blur-xs">
            <p className="text-[14px] text-muted-foreground flex items-center gap-2">
              During high-traffic periods, UX pulses shown on the dashboard may
              be reduced by a small percentage to protect dashboard performance.
              This does not affect the actual data collection used to measure
              Web Vitals.
            </p>
          </figcaption>
        </div>
      </div>
    </div>
  );
}

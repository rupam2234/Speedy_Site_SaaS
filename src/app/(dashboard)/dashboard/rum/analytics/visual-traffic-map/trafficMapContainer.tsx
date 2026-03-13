"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { alpha2ToAlpha3, CountryStripe } from "..";
import { useSiteContext } from "../../../siteContext";
import { MapChart } from "echarts/charts";
import {
  VisualMapComponent,
  GeoComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import * as echarts from "echarts/core";
import rawWorldMap from "../../../../../../../public/maps/worldMap.json";

echarts.use([
  MapChart,
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

const worldEN = rawWorldMap as unknown as any;

// Remove Antarctica from GeoJSON
worldEN.features = worldEN.features.filter(
  (feature: any) => feature.properties.name !== "Antarctica",
);

echarts.registerMap("world", worldEN);

type TrafficEntry = {
  device_type: "desktop" | "mobile" | "tablet" | "all";
  country_distribution: string;
};

type Props = {
  deviceType?: "desktop" | "mobile" | "tablet" | "all";
  trafficData: TrafficEntry[];
};

export default function CountryTrafficMap({ deviceType, trafficData }: Props) {
  const { theme } = useTheme();
  const { selectedDevice } = useSiteContext();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const trafficByCountryArray = React.useMemo(() => {
    if (!Array.isArray(trafficData)) return [];

    const found = trafficData.find((entry) => entry.device_type === deviceType);
    if (!found?.country_distribution) return [];

    try {
      const original = JSON.parse(found.country_distribution) as Record<
        string,
        number
      >;
      return Object.entries(original)
        .map(([alpha2, count]) => {
          const alpha3 = alpha2ToAlpha3[alpha2.toUpperCase()];
          if (!alpha3) return null; // skip unmapped codes
          return { code: alpha3, traffic: count };
        })
        .filter(Boolean) as { code: string; traffic: number }[];
    } catch {
      return [];
    }
  }, [deviceType, trafficData]);

  useEffect(() => {
    if (!chartRef.current || trafficByCountryArray.length === 0) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    const seriesData = worldEN.features.map((feature: any) => {
      const countryName = feature.properties.name;

      const d = trafficByCountryArray.find((x) => x.code === feature.id);

      return {
        name: countryName,
        value: d?.traffic || 0,
        itemStyle: {
          areaColor: d
            ? getColor(d.traffic)
            : theme === "dark"
              ? "#6ca3cc"
              : "#f0f0f0",
        },
        orginalData: d || {
          traffic: 0,
          code: "NAN",
        },
      };
    });

    const option: echarts.EChartsCoreOption = {
      series: [
        {
          name: "Traffic Data",
          type: "map",
          map: "world",
          roam: false,
          zoom: 1.25,
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
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          if (!params.data) return params.name;
          const traffic = params.data.value;

          return `<div style="font-family: sans-serif;"><b>${params.name}</b><br/>Visitors: ${traffic}</div>`;
        },
      },
    };

    chart.setOption(option, { lazyUpdate: true, notMerge: true, silent: true });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [trafficByCountryArray, theme, selectedDevice]);

  return (
    <>
      {trafficData && trafficData.length > 0 ? (
        <>
          <div className="col-span-5 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none from-primary/2 to-transparent z-0" />
            <div
              ref={chartRef}
              style={{ width: "100%", height: "360px" }}
              className="relative z-10"
            />
          </div>
          <CountryStripe
            data={trafficByCountryArray.length > 0 ? trafficByCountryArray : []}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );

  function getColor(count: number) {
    const colors = ["#2c7bb6", "#00ccbc", "#90eb9d", "#f29e2e", "#e76818"];

    const thresholds: { min: number; color: string }[] = [
      { min: 100, color: colors[4] },
      { min: 50, color: colors[3] },
      { min: 20, color: colors[2] },
      { min: 1, color: colors[1] },
      { min: 0, color: colors[0] },
    ];

    return thresholds.find((x) => count >= x.min)?.color ?? colors[0];
  }
}

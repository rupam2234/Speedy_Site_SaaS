"use client";

import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { UniversalTransition } from "echarts/features";
import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useSiteContext } from "@/app/(dashboard)/siteContext";

interface ChartProps {
  pageData: any;
  metric_key:
    | "Largest Contentful Paint (LCP)"
    | "Interaction to Next Paint (INP)"
    | "Cumulative Layout Shift (CLS)"
    | "First Contentful Paint (FCP)";
}

type ChartDataItem = {
  date: string;
  [key: string]: string | number | null;
};

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
]);

function debounce(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

export default function CWVChart({ pageData, metric_key }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const { selectedDevice } = useSiteContext();

  let chartData: ChartDataItem[] = [];

  switch (metric_key) {
    case "Largest Contentful Paint (LCP)":
      chartData = pageData.map((x: any) => ({
        date: new Date(x.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        crux_lcp: x.crux_lcp_p75,
        lab_lcp_mean: x.lab_lcp_mean,
        lab_lcp_max: x.lab_lcp_max,
        lab_lcp_min: x.lab_lcp_min,
      }));
      break;

    case "Cumulative Layout Shift (CLS)":
      chartData = pageData.map((x: any) => ({
        date: new Date(x.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        crux_cls: x.crux_cls_p75,
        lab_cls_mean: x.lab_cls_mean,
        lab_cls_max: x.lab_cls_max,
        lab_cls_min: x.lab_cls_min,
      }));
      break;

    case "First Contentful Paint (FCP)":
      chartData = pageData.map((x: any) => ({
        date: new Date(x.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        crux_fcp: x.crux_fcp_p75,
        lab_fcp_mean: x.lab_fcp_mean,
        lab_fcp_max: x.lab_fcp_max,
        lab_fcp_min: x.lab_fcp_min,
      }));
      break;

    case "Interaction to Next Paint (INP)":
      chartData = pageData.map((x: any) => ({
        date: new Date(x.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        crux_inp: x.crux_inp_p75,
        lab_inp_mean: x.inp_latency_mean,
        lab_inp_max: x.inp_latency_max,
        lab_inp_min: x.inp_latency_min,
      }));
      break;
  }

  useEffect(() => {
    if (!chartRef.current || !chartData.length) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;
    const gridLineColor = theme === "dark" ? "#393E46" : "#B3C8CF";

    const dimensionKeys = Object.keys(chartData[0] || {});

    const minKey = dimensionKeys.find((k) => k.endsWith("min"));
    const maxKey = dimensionKeys.find((k) => k.endsWith("max"));
    const meanKey = dimensionKeys.find((k) => k.includes("mean"));
    const cruxKey = dimensionKeys.find((k) => k.startsWith("crux"));

    const confidenceBandSeries = [];
    if (minKey && maxKey) {
      confidenceBandSeries.push(
        {
          name: "Min",
          type: "line",
          stack: "confidence-band",
          data: chartData.map((item) => item[minKey]),
          lineStyle: { opacity: 0 },
          symbol: "none",
          emphasis: { disabled: true },
        },
        {
          name: "Max-Min",
          type: "line",
          stack: "confidence-band",
          data: chartData.map(
            (item) => (item[maxKey] as number) - (item[minKey] as number)
          ),
          lineStyle: { opacity: 0 },
          symbol: "none",
          areaStyle: {
            color:
              theme === "dark"
                ? "rgba(0, 150, 255, 0.1)"
                : "rgba(0, 150, 255, 0.15)",
          },
          emphasis: { disabled: true },
        }
      );
    }

    const visibleSeries = [];
    const cruxName = cruxKey?.replace(/_/g, " ") ?? "";
    const meanName = meanKey?.replace(/_/g, " ") ?? "";

    const colorMap: Record<string, string> = {
      [cruxName]: "#FF5722",
      [meanName]: "#2196F3",
    };

    if (cruxKey) {
      visibleSeries.push({
        name: cruxName,
        type: "line",
        data: chartData.map((item) => item[cruxKey]),
        // smooth: 0.6,
        showSymbol: true,
        symbol: "circle",
        symbolSize: 2,
        lineStyle: {
          width: 2,
          color: colorMap[cruxName],
        },
        itemStyle: {
          color: colorMap[cruxName],
        },
        emphasis: {
          scale: true,
          itemStyle: {
            color: colorMap[cruxName],
          },
          symbolSize: 8, // bigger on hover
        },
      });
    }

    if (meanKey) {
      visibleSeries.push({
        name: meanName,
        type: "line",
        data: chartData.map((item) => item[meanKey]),
        // smooth: 0.6,
        showSymbol: true,
        symbol: "circle",
        symbolSize: 2,
        lineStyle: {
          width: 2,
          color: colorMap[meanName],
        },
        itemStyle: {
          color: colorMap[meanName],
        },
        emphasis: {
          scale: true,
          itemStyle: {
            color: colorMap[meanName],
          },
          symbolSize: 8, // bigger on hover
        },
      });
    }

    const series = [...confidenceBandSeries, ...visibleSeries];

    const option = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(50, 50, 50, 0.7)",
        borderWidth: 0,
        padding: 10,
        textStyle: {
          fontSize: 12,
          color: "#fff",
        },
        axisPointer: {
          type: "line",
          lineStyle: {
            color: "#999",
            width: 1,
            type: "dashed",
          },
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const date = params[0].axisValue;
          let tooltipText = `<div style="font-weight:bold; margin-bottom: 4px;">${date}</div>`;

          const keysOrder = ["crux", "mean", "max", "min"];

          keysOrder.forEach((key) => {
            const seriesItem = params.find((item: any) =>
              item.seriesName.toLowerCase().includes(key)
            );

            if (seriesItem) {
              const name = seriesItem.seriesName ?? "";
              const color = colorMap[name] || seriesItem.color || "#000";
              let value = seriesItem.data;

              if (value === null || value === undefined) {
                value = "N/A";
              }

              tooltipText += `
                <div>
                  <span style="color:${color};">&#9679;</span> ${name}: ${value}
                </div>
              `;
            }
          });

          return tooltipText;
        },
      },
      xAxis: {
        type: "category",
        name: "Date",
        nameLocation: "middle",
        nameTextStyle: { fontSize: 10, padding: 5 },
        axisLabel: {
          rotate: 0,
          fontSize: 10,
          interval: Math.floor(chartData.length / 5),
        },
        data: chartData.map((d) => d.date),
      },
      yAxis: {
        type: "value",
        nameTextStyle: { fontSize: 10, padding: 5 },
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor, type: "dashed", width: 1 },
        },
        splitNumber: 5,
      },
      grid: { top: 40, bottom: 30, left: 50, right: 20, height: 275 },
      series,
    };

    chart.setOption(option, { notMerge: false });

    const debouncedResize = debounce(() => chart.resize(), 0);
    const resizeObserver = new ResizeObserver(debouncedResize);

    if (chartRef.current) resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [pageData, metric_key, theme, selectedDevice]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height: "345px" }} />;
}

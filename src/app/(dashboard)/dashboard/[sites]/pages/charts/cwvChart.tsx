"use client";

import * as echarts from "echarts/core";
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from "echarts/components";
import { BarChart, LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

interface ChartProps {
  pageData: any;
  metric_key:
    | "Largest Contentful Paint (LCP)"
    | "Interaction to Next Paint (INP)"
    | "Cumulative Layout Shift (CLS)"
    | "First Contentful Paint (FCP)";
}

echarts.use([
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  CanvasRenderer,
]);

export default function CWVChart({ pageData, metric_key }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const { selectedDevice } = useSiteContext();

  const getMetricKeys = () => {
    switch (metric_key) {
      case "Largest Contentful Paint (LCP)":
        return {
          crux: "crux_lcp_p75",
          min: "lab_lcp_min",
          mean: "lab_lcp_mean",
          max: "lab_lcp_max",
        };
      case "Cumulative Layout Shift (CLS)":
        return {
          crux: "crux_cls_p75",
          min: "lab_cls_min",
          mean: "lab_cls_mean",
          max: "lab_cls_max",
        };
      case "First Contentful Paint (FCP)":
        return {
          crux: "crux_fcp_p75",
          min: "lab_fcp_min",
          mean: "lab_fcp_mean",
          max: "lab_fcp_max",
        };
      case "Interaction to Next Paint (INP)":
        return {
          crux: "crux_inp_p75",
          min: "inp_latency_min",
          mean: "inp_latency_mean",
          max: "inp_latency_max",
        };
      default:
        return {};
    }
  };

  const keys = getMetricKeys();

  const chartData = pageData.map((x: any) => ({
    date: new Date(x.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    crux: x[keys.crux!],
    min: x[keys.min!],
    mean: x[keys.mean!],
    max: x[keys.max!],
  }));

  // Calculate stacked values: min, mean-min, max-mean (all >=0)
  const minArr = chartData.map((d: any) => d.min ?? 0);
  const meanMinusMinArr = chartData.map((d: { mean: any; min: any }) =>
    Math.max((d.mean ?? 0) - (d.min ?? 0), 0)
  );
  const maxMinusMeanArr = chartData.map((d: { max: any; mean: any }) =>
    Math.max((d.max ?? 0) - (d.mean ?? 0), 0)
  );
  const cruxArr = chartData.map((d: { crux: any }) => d.crux ?? 0);

  useEffect(() => {
    if (!chartRef.current || !chartData.length) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    const option = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(50, 50, 50, 0.85)",
        borderWidth: 0,
        padding: 10,
        borderRadius: 4,
        textStyle: {
          fontSize: 12,
          color: "#fff",
        },
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: any) => {
          if (!params.length) return "";
          const date = params[0].axisValue;

          // Extract data for this date
          const min =
            params.find((p: any) => p.seriesName === "Min")?.data ?? 0;
          const meanMinusMin =
            params.find((p: any) => p.seriesName === "Mean-Min")?.data ?? 0;
          const maxMinusMean =
            params.find((p: any) => p.seriesName === "Max-Mean")?.data ?? 0;
          const crux =
            params.find((p: any) => p.seriesName === "CrUX P75")?.data ?? 0;

          const mean = min + meanMinusMin;
          const max = mean + maxMinusMean;

          let tooltipText = `<div style="font-weight:bold; margin-bottom: 6px;">${date}</div>`;

          const entries = [
            { name: "Min", value: min, color: "#82B1FF" },
            { name: "Mean", value: mean, color: "#3F51B5" },
            { name: "Max", value: max, color: "#1A237E" },
            { name: "CrUX P75", value: crux, color: "#FF5722" },
          ];

          entries.forEach(({ name, value, color }) => {
            const displayValue = value == null ? "N/A" : value.toFixed(2);
            tooltipText += `
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="
                  display: inline-block;
                  width: 10px;
                  height: 10px;
                  background-color: ${color};
                  border-radius: 50%;
                  margin-right: 8px;
                "></span>
                <span style="color: #fff;">${name}: ${displayValue}</span>
              </div>
            `;
          });

          return tooltipText;
        },
      },

      legend: {
        data: ["Min", "Mean-Min", "Max-Mean", "CrUX P75"],
        top: 5,
      },
      grid: {
        top: 40,
        bottom: 40,
        left: 50,
        right: 20,
      },
      xAxis: {
        type: "category",
        data: chartData.map((d: { date: any }) => d.date),
        axisPointer: { type: "shadow" },
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: {
            color: theme === "dark" ? "#393E46" : "#E0E0E0",
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "Min",
          type: "bar",
          stack: "range",
          data: minArr,
          itemStyle: {
            color: "#82B1FF",
          },
          barWidth: "60%",
          emphasis: { focus: "series" },
        },
        {
          name: "Mean-Min",
          type: "bar",
          stack: "range",
          data: meanMinusMinArr,
          itemStyle: {
            color: "#3F51B5",
          },
          emphasis: { focus: "series" },
        },
        {
          name: "Max-Mean",
          type: "bar",
          stack: "range",
          data: maxMinusMeanArr,
          itemStyle: {
            color: "#1A237E",
          },
          emphasis: { focus: "series" },
        },
        {
          name: "CrUX P75",
          type: "line",
          data: cruxArr,
          lineStyle: {
            width: 2,
            color: "#FF5722",
          },
          symbol: "circle",
          symbolSize: 6,
          itemStyle: {
            color: "#FF5722",
          },
          emphasis: {
            scale: true,
            itemStyle: {
              color: "#FF5722",
            },
            symbolSize: 10,
          },
        },
      ],
    };

    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [pageData, metric_key, theme, selectedDevice]);

  return <div ref={chartRef} style={{ width: "100%", height: "345px" }} />;
}

"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  GraphicComponent,
  MarkLineComponent,
  TransformComponent,
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { UniversalTransition } from "echarts/features";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  GraphicComponent,
  TransformComponent,
  MarkLineComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
]);

interface ChartProps {
  data: any[];
  metric_key: string;
}

export function getRanges(metric_key: string) {
  const ranges: {
    [key: string]: { a: number; b: number; c: number; d: number };
  } = {
    lcp: { a: 0, b: 2500, c: 4000, d: 6000 },
    cls: { a: 0, b: 0.1, c: 0.25, d: 0.5 },
    fcp: { a: 0, b: 1800, c: 3000, d: 4500 },
    inp: { a: 0, b: 200, c: 500, d: 800 },
    ttfb: { a: 0, b: 800, c: 1800, d: 3000 },
  };

  return ranges[metric_key] || null;
}

function debounce(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

const RumCwvChart = ({ data, metric_key }: ChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const { selectedDevice, rumDistribution } = useSiteContext();

  const metricRange = getRanges(metric_key);

  const chartData =
    data
      ?.filter(
        (entry) => entry.device_category === selectedDevice.toLowerCase()
      )
      .sort(
        (a, b) =>
          new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
      )
      .map((entry) => [
        entry.report_date,
        entry[`${metric_key}_${rumDistribution}`] ?? 0,
      ]) || [];

  const maxValue = Math.max(...chartData?.map((x) => x[1] ?? [])); // this give me the max value of the active matric

  const isMs = ["lcp", "fcp", "inp", "ttfb"].includes(metric_key);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;
    const gridLineColor = theme === "dark" ? "#393E46" : "#B3C8CF";

    if (chartData.length === 0) {
      const option = {
        xAxis: {
          type: "category",
          data: [],
          axisLabel: {
            color: theme === "dark" ? "#ccc" : "#333",
          },
          boundaryGap: false,
        },
        yAxis: {
          type: "value",
          splitLine: {
            show: true,
            lineStyle: { color: gridLineColor, type: "dashed", width: 1 },
          },
          axisLabel: {
            color: theme === "dark" ? "#ccc" : "#333",
          },
        },
        grid: { top: 40, bottom: 30, left: 50, right: 40, height: 300 },
        series: [], // No line series
        // No graphic text
      };

      chart.setOption(option, { notMerge: true });
      return;
    }

    // If there is data, proceed with full chart options
    const styledData = chartData.map(([x, y]) => {
      const isHigh = (y as number) >= metricRange.c;
      const isMed =
        (y as number) < metricRange.c && (y as number) > metricRange.b;
      const isGood =
        (y as number) > metricRange.a && (y as number) <= metricRange.b;

      const pointColor = isHigh
        ? "#FF3B30"
        : isMed
        ? "#FF9500"
        : isGood
        ? "#00E676"
        : theme === "dark"
        ? "#555"
        : "#ccc";

      return {
        value: [x, y],
        itemStyle: { color: pointColor },
        emphasis: {
          itemStyle: {
            color: pointColor,
            borderColor: pointColor,
            borderWidth: 2,
          },
        },
      };
    });

    const option = {
      tooltip: {
        trigger: "axis",
        padding: 0,
        borderWidth: 0,
        axisPointer: {
          type: "cross",
          crossStyle: { color: "#999", width: 1, type: "dashed" },
        },
        formatter: (params: any) => {
          const param = params[0];
          const value = param?.value[1];
          const displayValue = isMs
            ? value >= 1000
              ? `${(value / 1000).toFixed(2)}s`
              : `${Math.round(value)}ms`
            : value.toFixed(3);

          const colorClass =
            value >= metricRange?.c
              ? "text-[#FF3B30] dark:text-[#ff5c54]"
              : value > metricRange?.b
              ? "text-[#ffa11c] dark:text-[#ffb54d]"
              : "text-[#00E676] dark:text-[#2ae387]";

          return `
          <div class="p-3 bg-[#333446] dark:bg-accent-foreground w-auto rounded-sm text-primary-foreground">
            <p class="mb-2">${param.name}</p>
            <p>${rumDistribution.toUpperCase()} of ${selectedDevice.toLowerCase()} page loads experienced ≤ <span class="${colorClass} font-semibold">${displayValue}</span></p>
          </div>
        `;
        },
      },
      xAxis: {
        type: "category",
        axisLabel: {
          rotate: 0,
          fontSize: 10,
          interval: Math.floor(chartData.length / 5),
        },
        boundaryGap: false,
      },

      yAxis: {
        type: "value",
        max:
          rumDistribution === "p50" || rumDistribution === "p75"
            ? metric_key === "lcp" ||
              metric_key === "fcp" ||
              metric_key === "ttfb"
              ? maxValue + 1000 // this rises the chart height to ensure max value does not cross the top border
              : metric_key === "inp"
              ? maxValue + 1000
              : metric_key === "cls"
              ? metricRange.d
              : metricRange.d
            : {},
        splitLine: {
          show: false,
          lineStyle: { color: gridLineColor, type: "dashed", width: 1 },
        },
        splitNumber: 5,
      },
      grid: { top: 40, bottom: 30, left: 50, right: 40, height: 300 },
      series: [
        {
          type: "line",
          showSymbol: true,
          smooth: 0.6,
          symbolSize: 8,
          data: styledData,
          lineStyle: {
            color: theme === "dark" ? "#4ea6f4" : "",
            width: 1,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color:
                    theme === "dark"
                      ? "rgba(78, 166, 244, 0.3)"
                      : "rgba(0, 123, 205, 0.4)",
                },
                {
                  offset: 1,
                  color: "rgba(0, 123, 255, 0)",
                },
              ],
            },
          },
          encode: { x: 0, y: 1, tooltip: [1] },
          animationDurationUpdate: 300,
          animationEasingUpdate: "cubicOut",
          markLine: {
            symbol: ["none", "none"],
            emphasis: {
              disabled: true,
            },
            silent: true,
            data: [
              {
                yAxis: metricRange.b,
                lineStyle: { color: "#00E676", type: "dashed" },
              },
              {
                yAxis: metricRange.c,
                lineStyle: { color: "#FFD93D", type: "dashed" },
              },
              {
                yAxis: metricRange.d,
                lineStyle: { color: "#FF9898", type: "dashed" },
              },
            ],
          },
        },
      ],
    };

    chart.setOption(option, { notMerge: true });

    const debouncedResize = debounce(() => {
      chart.resize();
    }, 0);

    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [metric_key, selectedDevice, data, theme, rumDistribution]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex items-center justify-between px-4 mb-2 text-xs">
        <div className="text-lg font-semibold text-primary/80">
          {metric_key.toUpperCase()} Timeline
        </div>
        <span className="font-medium px-2 py-1 rounded bg-primary text-primary-foreground dark:bg-accent-foreground dark:text-accent">
          Active Distribution:
          <strong className="ml-1 uppercase">
            {rumDistribution ? rumDistribution : ""}
          </strong>
        </span>
      </div>
      <div ref={chartRef} style={{ width: "100%", height: "380px" }} />
    </div>
  );
};

export default RumCwvChart;

"use client";

import { useEffect, useMemo, useRef } from "react";
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
import TooltipIcon from "@/components/theme/customTooltip";
import { debounce } from "@/components/utils";

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

type DeviceDistribution = {
  device_type: "desktop" | "mobile" | "tablet";
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
};

interface ChartProps {
  data: any[];
  metric_key: string;
  shares: DeviceDistribution;
  total_events: number;
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

const RumCwvChart = ({
  data,
  metric_key,
  shares,
  total_events,
}: ChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const { selectedDevice, rumDistribution } = useSiteContext();

  const metricRange = getRanges(metric_key);

  const maxValue = useMemo(() => {
    return data && Math.max(...data?.map((x) => x[1] ?? []));
  }, [data]); // this give me the max value of the active matric

  const isMs = ["lcp", "fcp", "inp", "ttfb"].includes(metric_key.toLowerCase());

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;
    const gridLineColor = theme === "dark" ? "#393E46" : "#B3C8CF";

    if (data.length === 0) {
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
    const styledData = data.map(([x, y]) => {
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
          interval: Math.floor(data.length / 5),
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
              ? Number(maxValue.toFixed(0)) + 1000 // this rises the chart height to ensure max value does not cross the top border
              : metric_key === "inp"
                ? Number(maxValue.toFixed(0)) + 1000
                : metric_key === "cls"
                  ? maxValue + 0.1
                  : maxValue + 0.1
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
      <div className="flex items-center justify-between px-2 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium px-2 py-1 rounded bg-primary text-primary-foreground dark:bg-accent-foreground dark:text-accent">
            {metric_key.toUpperCase()} Timeline
          </span>
          <span>
            {metric_key === "lcp" ? (
              <>
                LCP measures the render time of the largest image or text block
                visible within the viewport.
              </>
            ) : (
              <></>
            )}
          </span>
        </div>
        <span className="font-medium px-2 py-1 rounded bg-primary text-primary-foreground dark:bg-accent-foreground dark:text-accent">
          Active Percentile:
          <strong className="ml-1 uppercase">
            {rumDistribution ? rumDistribution : ""}
          </strong>
        </span>
      </div>
      <div ref={chartRef} style={{ width: "100%", height: "380px" }} />
      <div className="px-2 my-2 md:grid-cols-3 text-sm text-primary/80 font-medium grid grid-cols-1 gap-2 ">
        <div className="md:border-r md:border-primary/10 col-span-1">
          <TooltipIcon
            content={
              metric_key === "lcp"
                ? `LCP is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                : metric_key === "cls"
                  ? `CLS is greater than ${metricRange.b} or less than ${metricRange.c}.`
                  : metric_key === "inp"
                    ? `INP is greater than ${metricRange.b} ms or less than ${metricRange.c} ms.`
                    : metric_key === "fcp"
                      ? `FCP is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                      : metric_key === "ttfb"
                        ? `TTFB is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                        : ""
            }
            side="top"
            trigger={
              <span className="cursor-pointer underline underline-offset-2 decoration-primary/20 decoration-dashed">
                Good
              </span>
            }
          />
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold">
              {shares !== null
                ? `${((shares?.good_count / total_events) * 100).toFixed(0)} %`
                : "N/A"}
            </h3>
            <div className="w-37.5 h-5 bg-gray-300 rounded overflow-hidden">
              <span
                className="block h-full bg-green-500"
                style={{
                  width: `${
                    shares !== null
                      ? ((shares?.good_count / total_events) * 100).toFixed(0)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <p> {shares !== null ? `of total events` : ``}</p>
        </div>
        <div className="md:border-r md:border-primary/10 col-span-1">
          <TooltipIcon
            content={
              metric_key === "lcp"
                ? `LCP is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                : metric_key === "cls"
                  ? `CLS is greater than ${metricRange.b} or less than ${metricRange.c}.`
                  : metric_key === "inp"
                    ? `INP is greater than ${metricRange.b} ms or less than ${metricRange.c} ms.`
                    : metric_key === "fcp"
                      ? `FCP is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                      : metric_key === "ttfb"
                        ? `TTFB is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                        : ""
            }
            side="top"
            trigger={
              <span className="cursor-pointer underline underline-offset-2 decoration-primary/20 decoration-dashed">
                Needs Improvement
              </span>
            }
          />
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold">
              {shares !== null
                ? `${((shares?.needs_improvement_count / total_events) * 100).toFixed(0)} %`
                : "N/A"}
            </h3>
            <div className="w-37.5 h-5 bg-gray-300 rounded overflow-hidden">
              <span
                className="block h-full bg-orange-300"
                style={{
                  width: `${
                    shares !== null
                      ? (
                          (shares?.needs_improvement_count / total_events) *
                          100
                        ).toFixed(0)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <p> {shares !== null ? `of total events` : ``}</p>
        </div>
        <div className="col-span-1">
          <TooltipIcon
            content={
              metric_key === "lcp"
                ? `LCP is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                : metric_key === "cls"
                  ? `CLS is greater than ${metricRange.b} or less than ${metricRange.c}.`
                  : metric_key === "inp"
                    ? `INP is greater than ${metricRange.b} ms or less than ${metricRange.c} ms.`
                    : metric_key === "fcp"
                      ? `FCP is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                      : metric_key === "ttfb"
                        ? `TTFB is greater than ${metricRange.b / 1000} sec or less than ${metricRange.c / 1000} sec.`
                        : ""
            }
            side="top"
            trigger={
              <span className="cursor-pointer underline underline-offset-2 decoration-primary/20 decoration-dashed">
                Poor
              </span>
            }
          />
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold">
              {shares !== null
                ? `${((shares?.poor_count / total_events) * 100).toFixed(0)} %`
                : "N/A"}{" "}
            </h3>
            <div className="w-37.5 h-5 bg-gray-300 rounded overflow-hidden">
              <span
                className="block h-full bg-red-400"
                style={{
                  width: `${
                    shares !== null
                      ? ((shares?.poor_count / total_events) * 100).toFixed(0)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <p> {shares !== null ? `of total events` : ``}</p>
        </div>
      </div>
    </div>
  );
};

export default RumCwvChart;

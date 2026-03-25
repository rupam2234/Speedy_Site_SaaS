"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { UniversalTransition } from "echarts/features";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { cwv_metrics } from "./cwvMetrics";
import { getRanges } from ".";

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
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

interface ChartProps {
  metric_key:
    | "cumulative_layout_shift"
    | "experimental_time_to_first_byte"
    | "interaction_to_next_paint"
    | "largest_contentful_paint";
}

export default function CoreWebVitalChart({ metric_key }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null); // Store chart instance
  const { theme } = useTheme();
  const {
    cruxData,
    selectedDevice,
    dailyCrux,
    startDate,
    endDate,
    setCruxData,
  } = useSiteContext();

  // date fallback options
  const date = new Date();
  date.setDate(date.getDate() - 180); // 180 days back

  const dateA = startDate
    ? startDate?.toISOString().split("T")[0]
    : date.toISOString().split("T")[0]; // modified start date
  const dateB = endDate
    ? endDate?.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]; // modified end date

  const deviceBased = cruxData
    .flat()
    .find((d) =>
      selectedDevice === "Mobile"
        ? d.record.key.formFactor === "PHONE"
        : d.record.key.formFactor === selectedDevice.toUpperCase(),
    );

  const collectionTime = deviceBased?.record.collectionPeriods;
  const p75Series =
    deviceBased?.record.metrics[metric_key]?.percentilesTimeseries?.p75s;

  // prepare date filter
  const filteredDates: [string, string][] = [];
  collectionTime?.forEach((x) => {
    const firstDateArray = createDate(
      x.firstDate.year,
      x.firstDate.month,
      x.firstDate.day,
    );
    const lastDateArray = createDate(
      x.lastDate.year,
      x.lastDate.month,
      x.lastDate.day,
    );
    filteredDates.push([firstDateArray, lastDateArray]);
  });

  // filtered data for chart
  const filteredData = filteredDates
    .map((dates, i) => ({ dates, value: p75Series?.[i] ?? 0 }))
    .filter((x) => x.dates[1] >= dateA && x.dates[1] <= dateB);

  // configuring for tooltip date readability
  const p75ChartData = filteredData.map(({ dates, value }) => {
    let startDate;
    let endDate;

    if (!startDate || !endDate) {
      startDate = new Date(dates[0]);
      endDate = new Date(dates[1]);
    }
    const formatOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    const startLabel = startDate
      .toLocaleDateString("en-US", formatOptions)
      .replace(/(\d+), (\w+)/, "$1, $2");
    const endLabel = endDate
      .toLocaleDateString("en-US", formatOptions)
      .replace(/(\d+), (\w+)/, "$1, $2");
    const label = `${startLabel} to ${endLabel}`; // "22, Dec to 25, Dec"
    return [label, value];
  });

  const finalChartData =
    p75ChartData && p75ChartData.length > 0
      ? [...p75ChartData]
      : getLast7DaysFallback();

  // if we have new daily data we will insert it to cruxhistory
  if (dailyCrux !== undefined && dailyCrux !== null) {
    const firstDate = dailyCrux[0].record.collectionPeriod.firstDate;
    const lastDate = dailyCrux[0].record.collectionPeriod.lastDate;
    const p75 = dailyCrux[0].record.metrics[metric_key].percentiles.p75;
    finalChartData.push([
      formatRange({ start: firstDate, end: lastDate }),
      p75,
    ]);
  }

  const metricRange = getRanges(metric_key);

  // chart config
  useEffect(() => {
    if (!chartRef.current || !finalChartData.length) return;

    // Initialize chart only once
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }
    const chart = chartInstanceRef.current;

    const gridLineColor = theme === "dark" ? "#393E46" : "#B3C8CF";

    const styledData = finalChartData.map(([x, y]) => {
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
          const value = param.value[1];

          const metric_key_data = cwv_metrics?.find(
            (x) => x.key === (metric_key as string),
          );

          const isCLS = metric_key === "cumulative_layout_shift";

          // Detect no data
          const isNoData = value == null || (!isCLS && value === 0);

          // Status label
          let status = "--";
          if (!isNoData) {
            if (value <= metricRange.b) status = "good";
            else if (value < metricRange.c) status = "okay";
            else status = "poor";
          }

          // Color logic
          let valueColor = theme === "dark" ? "text-[#555]" : "text-[#ccc]";
          if (!isNoData) {
            if (value >= metricRange.c) {
              valueColor = "text-[#FF3B30] dark:text-[#ff5c54]";
            } else if (value > metricRange.b) {
              valueColor = "text-[#ffa11c] dark:text-[#ffb54d]";
            } else {
              valueColor = "text-[#00E676] dark:text-[#2ae387]";
            }
          }

          return `
            <div class="p-3 bg-[#333446] dark:bg-accent-foreground w-auto rounded-sm text-primary-foreground">
              <p class="mb-2">${param.name}</p>
        
              ${
                !isNoData
                  ? `<p>75% of ${selectedDevice.toLocaleLowerCase()} page loads experienced</p>`
                  : ""
              }
        
              <div class="flex gap-1 items-center">
                <span>${metric_key_data?.acronym || ""}</span>${
                  isNoData ? "" : "≤"
                }
                <span class="${valueColor}">
                  ${isNoData ? ": not enough data yet, wait till Google's report or configure our RUM." : value}
                </span> ${isNoData ? "" : metric_key_data?.unit || ""}
              </div>
        
              ${
                !isNoData
                  ? `<p class="mt-2">Means ${metric_key_data?.acronym} was ${status}.</p>`
                  : ""
              }
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        nameLocation: "middle",
        nameTextStyle: { fontSize: 10, padding: 5 },
        axisLabel: {
          rotate: 0,
          fontSize: 10,
          interval: Math.floor(finalChartData.length / 5),
        },
      },
      yAxis: {
        type: "value",
        nameTextStyle: { fontSize: 10, padding: 5 },
        min: metricRange.a,
        max: metricRange.d,
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor, type: "dashed", width: 1 },
        },
        splitNumber: 5,
      },
      grid: { top: 40, bottom: 30, left: 40, right: 0, height: 315 },
      series: [
        {
          type: "line",
          connectNulls: false,
          showSymbol: true,
          smooth: 0.6, // Smooth line curve
          symbolSize: 8,
          data: styledData,
          lineStyle: { color: theme === "dark" ? "#aaa" : "#444", width: 1 },
          encode: { x: 0, y: 1, tooltip: [1] },
          animationDurationUpdate: 300, // Smooth update animation
          animationEasingUpdate: "cubicOut", // Easing for smooth transitions
        },
      ],
    };

    chart.setOption(option, { notMerge: false }); // Merge options to avoid flickering

    const debouncedResize = debounce(() => {
      chart.resize();
    }, 0);

    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    if (chartRef.current) resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [metric_key, selectedDevice, cruxData, finalChartData]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
      // setCruxData([]); // emptying chart data will impact the change of state p75 and distribution
    };
  }, [setCruxData]);

  // if (!p75ChartData || p75ChartData.length === 0) {
  //   return (
  //     <div className="flex items-center justify-center text-primary/40 h-full">
  //       No data available
  //     </div>
  //   );
  // }

  return <div ref={chartRef} style={{ width: "100%", height: "380px" }} />;
}

export function createDate(year: number, month: number, day: number): string {
  if (year !== null && month !== null && day !== null) {
    if (month > 12 || month < 0 || day < 0 || day > 31) {
      throw new Error("invalid date values");
    }

    return `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`;
  }

  return "invalid date!!!";
}

function formatRange({
  start,
  end,
}: {
  start: { day: number; month: number; year: number };
  end: { day: number; month: number; year: number };
}) {
  const startDate = new Date(start.year, start.month - 1, start.day);
  const endDate = new Date(end.year, end.month - 1, end.day);

  return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} to ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function getLast7DaysFallback() {
  const data: [string, number][] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);

    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    data.push([label, 0]); // 0 = no data
  }

  return data;
}

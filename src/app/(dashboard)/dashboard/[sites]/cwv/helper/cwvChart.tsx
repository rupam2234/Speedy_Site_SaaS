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
import { useSiteContext } from "@/app/(dashboard)/siteContext";
import { getRanges } from "./referenceAreaHandler";
import { Helpers } from "./helperFunc";
import { cwv_metrics } from "./cwvMetrics";

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
  metric_key: string;
}

const helper = new Helpers();

const ChartComponent = ({ metric_key }: ChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null); // Store chart instance
  const { theme } = useTheme();
  const { cruxData, selectedDevice, dateRange, setCruxData } = useSiteContext();

  const deviceBased = cruxData
    .flat()
    .find((d) =>
      selectedDevice === "Mobile"
        ? d.record.key.formFactor === "PHONE"
        : d.record.key.formFactor === selectedDevice.toUpperCase()
    );

  const collectionTime = deviceBased?.record.collectionPeriods;
  const p75Series =
    deviceBased?.record.metrics[metric_key]?.percentilesTimeseries?.p75s;

  // prepare date filter
  const filteredDates: [string, string][] = [];
  collectionTime?.forEach((x) => {
    const firstDateArray = helper.createDate(
      x.firstDate.year,
      x.firstDate.month,
      x.firstDate.day
    );
    const lastDateArray = helper.createDate(
      x.lastDate.year,
      x.lastDate.month,
      x.lastDate.day
    );
    filteredDates.push([firstDateArray, lastDateArray]);
  });

  // filtered data for chart
  const filteredData = filteredDates
    .map((dates, i) => ({ dates, value: p75Series?.[i] ?? 0 }))
    .filter((x) => x.dates[1] >= dateRange[0] && x.dates[1] <= dateRange[1]);

  // configuring for tooltip date readability
  const p75ChartData = filteredData.map(({ dates, value }) => {
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[1]);
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

  const metricRange = getRanges(metric_key);

  // chart config
  useEffect(() => {
    if (!chartRef.current || !p75ChartData.length) return;

    // Initialize chart only once
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }
    const chart = chartInstanceRef.current;

    const gridLineColor = theme === "dark" ? "#393E46" : "#B3C8CF";

    const styledData = p75ChartData.map(([x, y]) => {
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
          const metric_key_data = cwv_metrics?.find(
            (x) => x.key === (metric_key as string)
          ); // gives us access to metric key props
          return `
            <div class="p-3 bg-[#333446] dark:bg-accent-foreground w-auto rounded-sm text-primary-foreground">
              <p class="mb-2">${param.name}</p>
              <p>75% of ${selectedDevice.toLocaleLowerCase()} page loads experienced</p>
              <div class="flex gap-1 items-center">
                <span>${metric_key_data?.acronym || ""}</span>≤
                <span class="${
                  param.value[1] >= metricRange.c
                    ? "text-[#FF3B30] dark:text-[#ff5c54]"
                    : param.value[1] < metricRange.c &&
                      param.value[1] > metricRange.b
                    ? "text-[#ffa11c] dark:text-[#ffb54d]"
                    : param.value[1] > metricRange.a &&
                      param.value[1] <= metricRange.b
                    ? "text-[#00E676] dark:text-[#2ae387]"
                    : theme === "dark"
                    ? "text-[#555]"
                    : "text-[#ccc]"
                } font-semibold">${param.value[1]}</span> ${
            metric_key_data?.unit
          }
              </div>
              <p class="mt-2">Means ${metric_key_data?.acronym} was ${
            param.value[1] <= metricRange.b
              ? "good"
              : param.value[1] > metricRange.b && param.value[1] < metricRange.c
              ? "okay"
              : param.value[1] >= metricRange.c
              ? "poor"
              : "--"
          }.</p>
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
          interval: Math.floor(p75ChartData.length / 5),
        },
      },
      yAxis: {
        type: "value",
        nameTextStyle: { fontSize: 10, padding: 5 },
        min: 0,
        max: metricRange.d,
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor, type: "dashed", width: 1 },
        },
        splitNumber: 5,
      },
      grid: { top: 40, bottom: 30, left: 50, right: 20, height: 315 },
      series: [
        {
          type: "line",
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
  }, [metric_key, selectedDevice, cruxData, p75ChartData]);

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

  return <div ref={chartRef} style={{ width: "100%", height: "380px" }} />;
};

export default ChartComponent;

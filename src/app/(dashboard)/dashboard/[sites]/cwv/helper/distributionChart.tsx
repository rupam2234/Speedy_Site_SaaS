"use client";

import * as echarts from "echarts/core";
import {
  GridComponent,
  GridComponentOption,
  LegendComponentOption,
} from "echarts/components";
import { BarChart, BarSeriesOption } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import { useSiteContext } from "@/app/(dashboard)/siteContext";
import { Helpers } from "./helperFunc";
import { cwv_metrics } from "./cwvMetrics";

echarts.use([GridComponent, BarChart, CanvasRenderer]);

function debounce(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

type EChartsOption = echarts.ComposeOption<
  GridComponentOption | LegendComponentOption | BarSeriesOption
>;

interface ChartProps {
  metric_key: string;
}

const helper = new Helpers();

export default function DistributionChart({ metric_key }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { cruxData, selectedDevice, dateRange, setCruxData } = useSiteContext();

  const deviceBased = cruxData
    .flat()
    .find((d) =>
      selectedDevice === "Mobile"
        ? d.record.key.formFactor === "PHONE"
        : d.record.key.formFactor === selectedDevice.toUpperCase()
    );

  const collectionTime = deviceBased?.record.collectionPeriods;
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

  const distributionData =
    deviceBased?.record?.metrics[metric_key]?.histogramTimeseries;

  const rawData: number[][] = [];

  if (distributionData) {
    for (let i = 0; i < distributionData?.length; i++) {
      rawData.push(distributionData[i].densities as unknown as number[]);
    }
  }

  // filtered data for chart
  const filteredData = filteredDates
    .map((dates, i) => {
      const rawValues = [
        rawData?.[0]?.[i],
        rawData?.[1]?.[i],
        rawData?.[2]?.[i],
      ];

      const value = rawValues.map((v) =>
        typeof v === "number" && !isNaN(v) ? v : 0
      );

      return { dates, value };
    })
    .filter((x) => x.dates[1] >= dateRange[0] && x.dates[1] <= dateRange[1]);

  // configuring for tooltip date readability
  const DistChartData = filteredData.map(({ dates, value }) => {
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

  const totalData: number[] = DistChartData.map(([, values]) => {
    const v = values as number[];
    return parseFloat(v.reduce((sum, val) => sum + val, 0).toFixed(2));
  });

  const xAxisLabels: string[] = DistChartData.map(
    ([label]) => label as unknown as string
  );

  const grid = {
    left: 50,
    right: 20,
    top: 40,
    bottom: 30,
    height: 315,
  };

  const series: BarSeriesOption[] = ["Good", "Okay", "Poor"].map(
    (name, sid) => ({
      name,
      type: "bar",
      stack: "total",
      data: DistChartData.map(([, values], index) => {
        const total = totalData[index];
        const v = values as number[];
        return total <= 0 ? 0 : v[sid] / total;
      }),
      itemStyle: {
        color:
          name === "Good"
            ? "#66cc8f" // green
            : name === "Okay"
            ? "#FFEEA9" // yellow
            : "#FF9898", // red
      },
    })
  );

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const option: EChartsOption = {
      tooltip: {
        trigger: "axis",
        padding: 0,
        borderWidth: 0,
        formatter: (params: any) => {
          const param = params;
          console.log(param);
          const metric_key_data = cwv_metrics?.find(
            (x) => x.key === (metric_key as string)
          );

          return `<div class="p-3 bg-[#333446] border-none border-transparent dark:bg-accent-foreground w-auto rounded-sm text-primary-foreground">
            <p>Data for ${param[0].axisValueLabel}</p>
            <p class="mb-2">Among ${selectedDevice.toLowerCase()} page loads,</p>
             <ul class="list-disc ml-4">
                <li>${parseFloat(
                  (param[0].value * 100).toFixed(2)
                )} % users experienced <span class="text-[#66cc8f]">${
            param[0].seriesName
          }</span> ${metric_key_data?.acronym}
                </li>
                <li>${parseFloat(
                  (param[1].value * 100).toFixed(2)
                )} % users experienced <span class="text-[#FFEEA9]">${
            param[1].seriesName
          }</span> ${metric_key_data?.acronym}
                </li>
                <li>${parseFloat(
                  (param[2].value * 100).toFixed(2)
                )} % users experienced <span class="text-[#FF9898]">${
            param[2].seriesName
          }</span> ${metric_key_data?.acronym}
                </li>
             </ul>
          </div>`;
        },
      },
      grid,
      yAxis: {
        type: "value",
        min: 0,
        max: 1,
        splitLine: { show: false },
      },
      xAxis: {
        type: "category",
        data: xAxisLabels,
        axisLine: { show: true },
        axisTick: { show: true },
        splitLine: { show: false },
      },
      series,
    };

    chartInstanceRef.current.setOption(option, { notMerge: false });

    const debouncedResize = debounce(() => {
      chartInstanceRef.current?.resize();
    }, 0);

    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    if (chartRef.current) resizeObserver.observe(chartRef.current);

    // return () => {
    //   if (chartInstanceRef.current) {
    //     chartInstanceRef.current.dispose();
    //     chartInstanceRef.current = null;
    //   }
    // };

    return () => {
      resizeObserver.disconnect();
    };
  }, [cruxData, selectedDevice, dateRange, metric_key]);

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
}

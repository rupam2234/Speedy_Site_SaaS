import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from "echarts/components";
import { BarChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

// Register required components
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  CanvasRenderer,
]);

interface Props<T> {
  activeMetric: "LCP" | "CLS" | "INP" | "TTFB" | "FCP";
  data: T[];
}

type UrlDistType = {
  url: string;
  good: number;
  poor: number;
  needs_improvement: number;
};

export function UrlStackBar<T extends UrlDistType>({
  activeMetric,
  data,
}: Props<T>) {
  const { selectedSite } = useSiteContext();
  const chartRef = useRef<HTMLDivElement | null>(null);

  const [MAX_BARS, SET_MAX_BARS] = useState<number>(10);

  const sortedData = [...data]
    .sort(
      (a, b) =>
        b.good +
        b.needs_improvement +
        b.poor -
        (a.good + a.needs_improvement + a.poor),
    )
    .slice(0, MAX_BARS);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option = {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          return `${params.seriesName} ${activeMetric} count: ${params.value}`;
        },
      },
      // legend: {
      //   top: 0,
      //   left: 0,
      // },
      grid: {
        left: 300,
        right: 70,
        top: 40,
        bottom: 40,
      },
      xAxis: {
        type: "value",
        name: "Count",
      },
      yAxis: {
        type: "category",
        inverse: true, // <-- this flips the bars top-to-bottom
        data: sortedData.map((d) => `${selectedSite}${d.url}`),
        axisLabel: {
          fontSize: 12,
          width: 290,
          overflow: "truncate",
        },
      },
      series: [
        {
          name: "Good",
          type: "bar",
          stack: "total",
          data: sortedData.map((d) => d.good),
          itemStyle: { color: "#00c950" },
        },
        {
          name: "Needs Improvement",
          type: "bar",
          stack: "total",
          data: sortedData.map((d) => d.needs_improvement),
          itemStyle: { color: "#ffb86a" },
        },
        {
          name: "Poor",
          type: "bar",
          stack: "total",
          data: sortedData.map((d) => d.poor),
          itemStyle: { color: "#ff6467" },
        },
      ],
    };

    chart.setOption(option);

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data, MAX_BARS]);

  return (
    <div className="my-4 relative">
      <div className="absolute z-10 flex gap-2 items-center text-sm right-0 top-0">
        <label>Items to display</label>
        <select
          value={MAX_BARS}
          onChange={(e) => {
            SET_MAX_BARS(Number(e.target.value));
          }}
          className="w-10 outline-0 cursor-pointer"
        >
          {[5, 10, 15].map((x) => (
            <option
              className="dark:text-primary dark:bg-secondary-background/80"
              key={x}
              value={x}
            >
              {x}
            </option>
          ))}
        </select>
      </div>
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: `${Math.max(data.length * 25, 300)}px`,
        }}
      />
    </div>
  );
}

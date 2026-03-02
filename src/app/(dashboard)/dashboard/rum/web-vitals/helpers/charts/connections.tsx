import { useEffect, useRef } from "react";
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

type ConnectionPerformanceStats = {
  connection_type: string;

  desktop_good: number;
  desktop_poor: number;
  desktop_needs_improvement: number;

  mobile_good: number;
  mobile_poor: number;
  mobile_needs_improvement: number;

  tablet_good: number;
  tablet_poor: number;
  tablet_needs_improvement: number;

  other_good: number;
  other_poor: number;
  other_needs_improvement: number;
};

type DeviceSeriesData = {
  good: number;
  needs_improvement: number;
  poor: number;
};

interface Props {
  data: ConnectionPerformanceStats[];
}

export function ConnectionStackBars({ data }: Props) {
  const { selectedDevice } = useSiteContext();
  const chartRef = useRef<HTMLDivElement | null>(null);

  const filteredData: DeviceSeriesData[] = filterDeviceBasedData(
    data,
    selectedDevice,
  );

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    let option;

    if (filteredData) {
      // chart option object here
      option = {
        tooltip: {
          trigger: "item",
          formatter: (params: any) => {
            return `${params.seriesName} count: ${params.value}`;
          },
        },
        grid: {
          left: 110,
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
          inverse: true, // this flips the bars top-to-bottom
          data: data.map((d) => `${d.connection_type}`),
          axisLabel: {
            fontSize: 12,
            width: 100,
            overflow: "truncate",
          },
        },
        series: [
          {
            name: "Good",
            type: "bar",
            stack: "total",
            data: filteredData?.map((d) => d.good),
            itemStyle: { color: "#00c950" },
          },
          {
            name: "Needs Improvement",
            type: "bar",
            stack: "total",
            data: filteredData?.map((d) => d.needs_improvement),
            itemStyle: { color: "#ffb86a" },
          },
          {
            name: "Poor",
            type: "bar",
            stack: "total",
            data: filteredData.map((d) => d.poor),
            itemStyle: { color: "#ff6467" },
          },
        ],
      };
    }

    chart.setOption(option!); // set the options to chart

    // we need to resize the chart as well
    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data]);

  return (
    <div className="my-4 relative">
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: `${Math.max(data.length * 25, 300)}px`,
        }}
      />
    </div>
  );

  function filterDeviceBasedData(
    data: ConnectionPerformanceStats[],
    selectedDevice: "Desktop" | "Mobile" | "Tablet" | "All",
  ): DeviceSeriesData[] {
    const metrics = ["good", "needs_improvement", "poor"] as const;

    if (selectedDevice === "All") {
      return data.map((x) =>
        metrics.reduce((acc, metric) => {
          acc[metric] =
            x[`desktop_${metric}`] +
            x[`mobile_${metric}`] +
            x[`tablet_${metric}`] +
            x[`other_${metric}`];
          return acc;
        }, {} as DeviceSeriesData),
      );
    }

    const devicePrefixMap = {
      Desktop: "desktop",
      Mobile: "mobile",
      Tablet: "tablet",
    };

    const prefix = devicePrefixMap[selectedDevice];

    return data.map((x) =>
      metrics.reduce((acc, metric) => {
        acc[metric] = x[`${prefix}_${metric}` as keyof typeof x] as number;
        return acc;
      }, {} as DeviceSeriesData),
    );
  } // applied DRY
}

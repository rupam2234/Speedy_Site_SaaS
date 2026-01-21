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
  data: T[];
}

type UrlDistType = {
  url: string;
  good: number;
  poor: number;
  needs_improvement: number;
};

export default function UrlStackBar<T extends UrlDistType>({ data }: Props<T>) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const option = {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          return `
            <strong>${params.name}</strong><br/>
            ${params.seriesName}: ${params.value}
          `;
        },
      },
      legend: {
        top: 0,
      },
      grid: {
        left: 220,
        right: 40,
        top: 40,
        bottom: 40,
      },
      xAxis: {
        type: "value",
        name: "Count",
      },
      yAxis: {
        type: "category",
        data: data.map((d) => d.url),
        axisLabel: {
          fontSize: 10,
          width: 200,
          overflow: "truncate",
        },
      },
      series: [
        {
          name: "Good",
          type: "bar",
          stack: "total",
          data: data.map((d) => d.good),
          itemStyle: { color: "#34a853" },
        },
        {
          name: "Needs Improvement",
          type: "bar",
          stack: "total",
          data: data.map((d) => d.needs_improvement),
          itemStyle: { color: "#fbbc05" },
        },
        {
          name: "Poor",
          type: "bar",
          stack: "total",
          data: data.map((d) => d.poor),
          itemStyle: { color: "#ea4335" },
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
  }, [data]);

  return (
    <div className="my-4">
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: `${Math.max(data.length * 32, 300)}px`,
        }}
      />
    </div>
  );
}

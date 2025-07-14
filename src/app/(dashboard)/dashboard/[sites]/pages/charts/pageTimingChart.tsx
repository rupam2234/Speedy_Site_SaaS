"use client";

import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { PieChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { LabelLayout } from "echarts/features";
import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
  LabelLayout,
]);

interface RequestsChartProps {
  pageData: any[];
  activeModule: "Document Timing" | "LCP Timing" | "Page Timing";
}

type DataProps = {
  name: string;
  value: number | string | null;
};

interface PageTimingPrpops {
  backEndTime: number | null;
  domContentLoadedTime: number | null;
  domInteractiveTime: number | null;
  domainLookupTime: number | null;
  frontEndTime: number | null;
  pageDownloadTime: number | null;
  pageLoadTime: number | null;
  redirectionTime: number | null;
  serverConnectionTime: number | null;
  serverResponseTime: number | null;
}

function debounce(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

export default function PageTimingChart({
  pageData,
  activeModule,
}: RequestsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  let chartData: DataProps[] = [];

  switch (activeModule) {
    case "Page Timing": {
      const x: PageTimingPrpops = pageData[pageData.length - 1].pageload_timing;

      chartData = [
        { value: x.backEndTime, name: "Back-End Processing" },
        { value: x.frontEndTime, name: "Front-End Rendering" },
        { value: x.pageLoadTime, name: "Total Page Load" },
        { value: x.domContentLoadedTime, name: "DOM Content Loaded" },
        { value: x.domInteractiveTime, name: "DOM Interactive" },
        { value: x.pageDownloadTime, name: "Content Download" },
        { value: x.domainLookupTime, name: "DNS Lookup" },
        { value: x.serverConnectionTime, name: "TCP Connection" },
        { value: x.serverResponseTime, name: "Server Response" },
        { value: x.redirectionTime, name: "Redirects" },
      ];

      break;
    }

    default:
      chartData = [];
      break;
  }

  useEffect(() => {
    if (!chartRef.current || !pageData?.length) return;
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }
    const chart = chartInstanceRef.current;

    const option = {
      title: {
        text: "Page Timing Breakdown",
        left: "center",
        textStyle: {
          color: theme === "dark" ? "#fff" : "#000",
          fontSize: 12,
          fontWeight: "normal",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          return `
            ${params.marker} <strong>${params.name}</strong>: ${params.value} ms (${params.percent}%)
              `;
        },
      },
      legend: {
        orient: "vertical",
        left: "left",
        textStyle: {
          color: theme === "dark" ? "#fff" : "#000",
        },
      },
      series: [
        {
          name: "Timing",
          type: "pie",
          radius: "65%",
          data: chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
            label: {
              show: true,
              color: theme === "dark" ? "#fff" : "#000",
            },
          },
          label: {
            color: theme === "dark" ? "#fff" : "#000",
          },
        },
      ],
    };

    chart.setOption(option, { notMerge: true });

    const debouncedResize = debounce(() => chart.resize(), 0);
    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [pageData, theme]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div ref={chartRef} style={{ width: "100%", height: "345px" }} />
      <div style={{ marginBottom: "12px", color: "#666", fontSize: "14px" }}>
        <p>
          💡 Tip: In case of bad performance, look for timings above{" "}
          <strong>300 ms</strong>.
        </p>
      </div>
    </>
  );
}

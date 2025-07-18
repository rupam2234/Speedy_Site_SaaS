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
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import Link from "next/link";

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

interface LCPTiming {
  ttfb: number;
  startTime: number;
  resourceLoadDuration: number;
  resourceLoadDelay: number;
  elementRenderDelay: number;
  loadTime: number;
}

interface LCPBlocks {
  urls: string | null;
  tags: string | null;
  sizes: number | null;
}

function debounce(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

export default function LCPPieChart({
  pageData,
  activeModule,
}: RequestsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Go to next item (wraps around to start)
  const nextItem = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % lcpBlocks.length);
  };

  const lcpBlocks: LCPBlocks[] = pageData[pageData.length - 1].lcp_data.map(
    (x: any) => ({
      urls: x.url ?? null,
      tags: x.tag ?? null,
      sizes: typeof x.size === "number" ? x.size : null,
    })
  );

  let chartData: DataProps[] = [];

  switch (activeModule) {
    case "LCP Timing": {
      const y: LCPTiming = pageData[pageData.length - 1].lcp_timing;

      chartData = [
        { value: y.ttfb, name: "TTFB (Time to First Byte)" },
        { value: y.resourceLoadDuration, name: "Resource Load Duration" },
        { value: y.resourceLoadDelay, name: "Resource Load Delay" },
        { value: y.elementRenderDelay, name: "Element Render Delay" },
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
        text: "LCP Element Timing Breakdown",
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
      <div
        className="flex justify-between items-center mb-3"
        style={{ color: "#666", fontSize: "14px" }}
      >
        <div className="flex gap-1">
          💡 <span>LCP Asset:</span>{" "}
          <Link
            className="underline hover:no-underline text-blue-500"
            href={lcpBlocks[currentIndex]?.urls || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lcpBlocks[currentIndex]?.urls?.split("/")[
              lcpBlocks[currentIndex]?.urls?.split("/").length - 1
            ] || "N/A"}
          </Link>
          <span>
            {((lcpBlocks[currentIndex]?.sizes ?? 0) / 1024).toFixed(2)} kb
          </span>
          <span>
            {(lcpBlocks[currentIndex]?.tags?.match(/<\s*(\w+)/g) || []).length >
              0 && "["}
            {(lcpBlocks[currentIndex]?.tags?.match(/<\s*(\w+)/g) || [])
              .map((t) => t.replace(/<\s*/, ""))
              .join(", ")}
            {(lcpBlocks[currentIndex]?.tags?.match(/<\s*(\w+)/g) || []).length >
              0 && "]"}
          </span>
        </div>

        {lcpBlocks && (
          <button
            className={`px-2 py-[2px] ${
              lcpBlocks.length! <= 1 ? "hidden" : "block"
            } rounded-sm dark:bg-secondary-background bg-gray-400/20 hover:bg-gray-400/10 dark:hover:bg-secondary-background/80 text-[#666] text-[14px] dark:text-primary cursor-pointer`}
            onClick={nextItem}
          >
            Next
          </button>
        )}
      </div>
    </>
  );
}

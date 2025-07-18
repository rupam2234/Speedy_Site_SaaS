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
  activeModule: "Document Timing" | "LCP Timing" | "INP timing";
}

type DataProps = {
  name: string;
  value: number | string | null;
};

interface DocumentTiming {
  blocked: { mean: number };
  connect: { mean: number };
  dns: { mean: number };
  queued: { mean: number };
  receive: { mean: number };
  send: { mean: number };
  ssl: { mean: number };
  wait: { mean: number };
}

function debounce(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

export default function TimingPieChart({
  pageData,
  activeModule,
}: RequestsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  let chartData: DataProps[] = [];
  let total: number = 0;

  switch (activeModule) {
    case "Document Timing": {
      const x: DocumentTiming = pageData[pageData.length - 1].document_timing;

      total =
        x.blocked.mean +
        x.connect.mean +
        x.dns.mean +
        x.queued.mean +
        x.receive.mean +
        x.send.mean +
        x.ssl.mean +
        x.wait.mean;

      chartData = [
        { value: x.queued.mean, name: "queued" },
        { value: x.blocked.mean, name: "blocked" },
        { value: x.dns.mean, name: "dns" },
        { value: x.connect.mean, name: "connect" },
        { value: x.ssl.mean, name: "ssl" },
        { value: x.send.mean, name: "send" },
        { value: x.wait.mean, name: "wait" },
        { value: x.receive.mean, name: "receive" },
      ];
      break;
    }

    default:
      chartData = [];
      total = 0;
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
        text: "Main Document (HTML) Timing Breakdown",
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
      ${params.marker} <strong>${params.name}</strong>: ${params.value} ms (${
            params.percent
          }%)
           <br/><span style="padding-left: 16px;"><strong>total:</strong> ${total.toFixed(
             2
           )} ms</span>
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
          💡Hint: <strong>queued</strong> → <strong>blocked</strong> →{" "}
          <strong>dns</strong> → <strong>connect</strong> → <strong>ssl</strong>{" "}
          → <strong>send</strong> → <strong>wait</strong> →{" "}
          <strong>receive</strong>
        </p>
      </div>
    </>
  );
}

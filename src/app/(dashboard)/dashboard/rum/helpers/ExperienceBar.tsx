"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent, TitleComponent } from "echarts/components";
import { TreemapChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { UniversalTransition } from "echarts/features";
import { useTheme } from "@/components/theme/ThemeProvider";

echarts.use([
  TooltipComponent,
  TitleComponent,
  TreemapChart,
  CanvasRenderer,
  UniversalTransition,
]);

type ExperienceQuality = "Good" | "Okay" | "Poor";

export interface ExperienceData {
  device_type: string;
  experience_quality: ExperienceQuality;
  session_count: number;
  avg_fcp: number;
  avg_cls: number;
  avg_ttfb: number;
  avg_lcp: number;
  avg_inp: number;
  avg_performance_score: number;
  avg_long_tasks: number;
  avg_slow_api_calls: number;
  avg_trackers: number;
  percentage_in_device_type: number;
  country_count: number;
}

interface ExperienceBarChartProps {
  data: ExperienceData[];
  deviceType: string;
}

const COLORS: Record<ExperienceQuality, string> = {
  Good: "#66cc8f",
  Okay: "#ffeea9",
  Poor: "#FF9898",
};

const formatMs = (value: number | null | undefined): string => {
  if (value == null || isNaN(value)) return "-";
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
};

export default function ExperienceBar({
  data,
  deviceType,
}: ExperienceBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const chartDom = chartRef.current;
    if (!chartDom) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartDom);
    }

    const chart = chartInstanceRef.current;

    const filtered = data.filter(
      (d) => d.device_type.toLowerCase() === deviceType.toLowerCase()
    );

    const children = filtered.map((item) => {
      const tooltipLines = [
        `<div style="margin-bottom:6px;">${item.session_count} <strong>${item.experience_quality}</strong> pageviews</div>`,
      ];

      if (item.avg_fcp != null)
        tooltipLines.push(`<div>Avg FCP: ${formatMs(item.avg_fcp)}</div>`);
      if (item.avg_cls != null)
        tooltipLines.push(`<div>Avg CLS: ${item.avg_cls.toFixed(3)}</div>`);
      if (item.avg_ttfb != null)
        tooltipLines.push(`<div>Avg TTFB: ${formatMs(item.avg_ttfb)}</div>`);
      if (item.avg_lcp != null)
        tooltipLines.push(`<div>Avg LCP: ${formatMs(item.avg_lcp)}</div>`);
      if (item.avg_inp != null)
        tooltipLines.push(`<div>Avg INP: ${formatMs(item.avg_inp)}</div>`);

      return {
        name: `${
          item.experience_quality
        } (${item.percentage_in_device_type.toFixed(0)}%)`,
        value: item.session_count,
        itemStyle: {
          color: COLORS[item.experience_quality],
        },
        tooltip: {
          formatter: `
            <div style="padding:6px 8px; font-size:13px;">
              ${tooltipLines.join("")}
            </div>
          `,
        },
      };
    });

    const option: echarts.EChartsCoreOption = {
      tooltip: {
        trigger: "item",
        confine: false,
        appendToBody: true,
        backgroundColor: "rgba(30,30,30,0.85)",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
        },
        formatter: (params: any) => params?.data?.tooltip?.formatter || "",
      },
      series: [
        {
          type: "treemap",
          roam: false,
          nodeClick: false,
          left: 15,
          right: 15,
          top: 0,
          bottom: 0,
          label: {
            show: true,
            formatter: "{b}",
            color: "#000",
          },
          upperLabel: { show: false, height: 0 },
          breadcrumb: { show: false },
          data: [
            {
              children,
            },
          ],
        },
      ],
    };

    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartDom);

    return () => {
      chart.dispose();
      resizeObserver.disconnect();
      chartInstanceRef.current = null;
    };
  }, [data, deviceType, theme]);

  return (
    <div
      className="w-full relative bg-transparent"
      style={{ overflow: "visible" }}
    >
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: "50px",
          backgroundColor: "transparent",
          borderRadius: "10px",
        }}
        className="rounded-md"
      />
    </div>
  );
}

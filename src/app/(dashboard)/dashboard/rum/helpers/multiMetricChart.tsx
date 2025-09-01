"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { UniversalTransition } from "echarts/features";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import TooltipIcon from "@/components/utils/customTooltip";

export type Mixed_metric = {
  date_collected: string;
  device_type: "desktop" | "mobile";
  sample_count: number;
  lcp_p75: number;
  cls_p75: number;
  inp_p75: number | null;
  ttfb_p75: number;
  overall_performance_score: number | null;
  engagement_quality_score: number;
  speed_index: number;
  user_experience_score: number;
  conversion_potential_index: number;
  total_pageviews: number;
  total_sessions: number;
  bounce_rate: number;
  avg_pages_per_session: number;
};

echarts.use([
  TooltipComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
]);

type Props = {
  data: Mixed_metric[];
};

const METRICS = [
  {
    key: "overall_performance_score",
    label: "Performance",
    description:
      "Weighted average of good Core Web Vitals. Higher is better; 75+ is excellent.",
  },
  {
    key: "engagement_quality_score",
    label: "Engagement",
    description:
      "Based on low bounce rates and deeper navigation. 50+ shows strong engagement.",
  },
  {
    key: "speed_index",
    label: "Speed Index",
    description:
      "Simplified loading performance. Penalizes slow TTFB and LCP. 70+ is excellent.",
  },
  {
    key: "user_experience_score",
    label: "UX Score",
    description:
      "Penalizes layout shifts and interaction delays. 80+ indicates smooth UI.",
  },
  {
    key: "conversion_potential_index",
    label: "Conversion",
    description:
      "Estimates conversion likelihood using bounce rate, pages per session, and TTFB.",
  },
];

const COLORS = ["#007BFF", "#FF9500", "#28A745", "#6F42C1", "#FF3B30"];

export default function SingleMetricChart({ data }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const { selectedDevice } = useSiteContext();
  const [selectedMetric, setSelectedMetric] = useState(METRICS[0].key);

  const chartData = data
    .filter((d) => d.device_type === selectedDevice?.toLowerCase())
    .sort(
      (a, b) =>
        new Date(a.date_collected).getTime() -
        new Date(b.date_collected).getTime()
    );

  const dates = [...new Set(chartData.map((d) => d.date_collected))];
  const values = dates.map((date) => {
    const entry = chartData.find((d) => d.date_collected === date);
    const val = entry ? entry[selectedMetric as keyof Mixed_metric] : 0;
    return val ?? 0;
  });

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartInstanceRef.current
      ? chartInstanceRef.current
      : echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    const metricLabel = METRICS.find((m) => m.key === selectedMetric)?.label;
    const metricColor =
      COLORS[METRICS.findIndex((m) => m.key === selectedMetric)];

    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        backgroundColor: theme === "dark" ? "#2e2e38" : "#fff",
        borderColor: theme === "dark" ? "#444" : "#ccc",
        textStyle: {
          color: theme === "dark" ? "#eee" : "#333",
        },
        formatter: (params: any) => {
          const p = params[0];
          return `<strong>${p.axisValue}</strong><br/>${metricLabel}: ${p.data}`;
        },
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: {},
        axisLine: { lineStyle: { color: theme === "dark" ? "#888" : "#666" } },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        max: 100,
        min: 0,
        splitLine: {
          lineStyle: {
            type: "dashed",
            color: theme === "dark" ? "#444" : "#ccc",
          },
        },
        axisLine: { lineStyle: { color: theme === "dark" ? "#888" : "#666" } },
      },
      grid: { top: 60, right: 40, bottom: 60, left: 40 },
      series: [
        {
          name: metricLabel,
          type: "line",
          data: values,
          smooth: true,
          symbolSize: 4, // smaller dot
          showSymbol: true,
          emphasis: {
            symbolSize: 8, // grow on hover
          },
          lineStyle: { color: metricColor },
          itemStyle: { color: metricColor },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color:
                    theme === "dark"
                      ? `${metricColor}44` // light fill
                      : `${metricColor}33`,
                },
                {
                  offset: 1,
                  color: "transparent",
                },
              ],
            },
          },
        },
      ],
    };

    chart.setOption(option);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [selectedMetric, data, selectedDevice, theme]);

  const handleMetricChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMetric(ev.target.value);
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
        <TooltipIcon
          side="left"
          content={
            METRICS.find((m) => m.key === selectedMetric)?.description || ""
          }
        />
        <select
          value={selectedMetric}
          onChange={handleMetricChange}
          className="border p-1 rounded bg-white dark:bg-muted text-sm"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div ref={chartRef} style={{ width: "100%", height: "360px" }} />
    </div>
  );
}

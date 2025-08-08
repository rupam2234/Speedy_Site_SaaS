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

//  Overall Performance Score (0-100)
// This is a weighted average of the "good" percentages across all Core Web Vitals metrics. Each metric contributes 25% to the final score.

// Formula breakdown:

// Calculate the percentage of "good" values for each metric (LCP, CLS, INP, TTFB)
// Apply equal weighting (25%) to each percentage
// Sum them up to get a score between 0-100
// Interpretation: Higher is better. A score of 75+ indicates excellent overall web performance.

// 2. Engagement Quality Score (0-100+)
// This metric combines user engagement signals to quantify how effectively users are interacting with your site.

// Formula breakdown:

// Start with the inverse of bounce rate (100 - bounce_rate) * 0.5
// This gives 0-50 points for low bounce rates
// Add (avg_pages_per_session * 20)
// This rewards sites where users view multiple pages
// Interpretation: Higher is better. Scores above 50 indicate strong engagement. The theoretical maximum depends on your average pages per session.

// 3. Speed Index (0-100)
// This is a normalized score that simplifies speed metrics into a single number.

// Formula breakdown:

// Start with 100 (perfect score)
// Subtract penalties based on:
// TTFB: (ttfb_p75 / 2000 * 40) - up to 40 points penalty for slow TTFB
// LCP: (lcp_p75 / 4000 * 60) - up to 60 points penalty for slow LCP
// Interpretation: Higher is better. Above 70 is excellent, 50-70 is good, below 50 needs improvement.

// 4. User Experience Score (0-100)
// This metric focuses on the smoothness and responsiveness of the user interface.

// Formula breakdown:

// Start with 100 (perfect score)
// Subtract penalties based on:
// CLS: (cls_p75 * 100) - penalizes layout shifts
// INP: (inp_p75 / 500 * 50) - penalizes slow interaction response times
// Interpretation: Higher is better. Above 80 indicates a smooth, responsive experience.

// 5. Conversion Potential Index (0-100)
// This composite metric estimates the likelihood of conversions based on both technical performance and user behavior.

// Formula breakdown:

// 40% weight: (100 - bounce_rate) - rewards low bounce rates
// 30% weight: (avg_pages_per_session * 10) - rewards deeper site exploration
// 30% weight: percentage of "good" TTFB values - rewards fast initial loading
// Interpretation: Higher is better. This metric correlates with conversion likelihood. Above 60 is excellent, 40-60 is good, below 40 suggests optimization opportunities.

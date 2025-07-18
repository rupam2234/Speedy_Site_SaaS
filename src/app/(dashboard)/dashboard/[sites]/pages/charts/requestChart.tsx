"use client";

import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { UniversalTransition } from "echarts/features";
import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
]);

interface RequestsChartProps {
  pageData: any;
}

function debounce(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

export default function RequestsChart({ pageData }: RequestsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const { selectedDevice } = useSiteContext();

  const chartData = pageData.map((x: any) => ({
    date: x.created_at,
    js: x.lab_js_request_count_max || 0,
    css: x.lab_css_request_count_max || 0,
    image: x.lab_image_request_count_max || 0,
    font: x.lab_font_request_count_max || 0,
    html: x.lab_html_request_count_max || 0,
    json: x.lab_json_request_count_max || 0,
    svg: x.lab_svg_request_count_max || 0,
    third_party: x.third_party_req_max || 0,
  }));

  const seriesKeys = [
    { key: "js", name: "JS" },
    { key: "css", name: "CSS" },
    { key: "image", name: "Image" },
    { key: "font", name: "Font" },
    { key: "html", name: "HTML" },
    { key: "json", name: "JSON" },
    { key: "svg", name: "SVG" },
    { key: "third_party", name: "Third Party" },
  ];

  useEffect(() => {
    if (!chartRef.current || !chartData.length) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;
    const gridLineColor = theme === "dark" ? "#393E46" : "#B3C8CF";

    const series = seriesKeys.map(({ key, name }) => ({
      name,
      type: "line",
      stack: "Requests",
      areaStyle: {},
      emphasis: { focus: "series" },
      data: chartData.map((item: any) => item[key]),
      // smooth: 0.6,
      lineStyle: {
        width: 0,
      },
    }));

    const option = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(50, 50, 50, 0.9)",
        textStyle: { color: "#fff", fontSize: 12 },
        formatter: (params: any[]) => {
          const index = params[0].dataIndex;
          const item = chartData[index];
          const date = item.date;

          const keyFromName = (name: string) =>
            seriesKeys.find((s) => s.name === name)?.key || "";

          let tooltipHTML = `<div style="font-weight:bold; margin-bottom: 4px;">${date}</div>`;
          params.forEach((p) => {
            const key = keyFromName(p.seriesName);
            const value = item[key] ?? 0;
            tooltipHTML += `
              <div style="margin-bottom:2px;">
                <span style="color:${p.color}; margin-right:6px;">●</span>
                ${p.seriesName}: ${value} requests
              </div>`;
          });

          return tooltipHTML;
        },
      },
      legend: {
        data: seriesKeys.map((s) => s.name),
        textStyle: {
          color: theme === "dark" ? "#ffffff" : "#333333",
        },
      },
      grid: {
        top: 40,
        bottom: 30,
        left: 50,
        right: 20,
        height: 275,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: chartData.map((item: any) => item.date),
      },
      yAxis: {
        type: "value",
        name: "Requests",
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor, type: "dashed", width: 1 },
        },
      },
      series,
    };

    chart.setOption(option, { notMerge: true });

    const debouncedResize = debounce(() => chart.resize(), 0);
    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [chartData, theme, selectedDevice]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height: "345px" }} />;
}

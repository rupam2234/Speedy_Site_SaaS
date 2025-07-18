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

interface AssetChartProps {
  pageData: any;
  assetKey: "Content Size" | "Transfer Size" | "Requests Count";
}

type ChartDataItem = {
  date: string;
  [key: string]: string | number | null;
};

function debounce(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

export default function AssetChart({ pageData, assetKey }: AssetChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const { selectedDevice } = useSiteContext();

  let chartData: ChartDataItem[] = [];

  switch (assetKey) {
    case "Content Size":
      chartData = pageData.map((x: any) => {
        const js = x.lab_js_contentsize_max || 0;
        const css = x.lab_css_contentsize_max || 0;
        const image = x.lab_image_contentsize_max || 0;
        const font = x.lab_font_contentsize_max || 0;
        const html = x.lab_html_contentsize_max || 0;
        const json = x.lab_json_contentsize_max || 0;
        const svg = x.lab_svg_contentsize_max || 0;
        const thirdParty = x.third_party_content_size_max || 0;

        const total = js + css + image + font + html + json + svg + thirdParty;

        const safeDivide = (value: number) =>
          total ? parseFloat(((value / total) * 100).toFixed(2)) : 0;

        return {
          date: x.created_at,
          total_contentSize: total,
          js_contentSize: js,
          css_contentSize: css,
          image_contentSize: image,
          font_contentSize: font,
          html_contentSize: html,
          json_contentSize: json,
          svg_contentSize: svg,
          third_party_contentSize: thirdParty,

          js_percent: safeDivide(js),
          css_percent: safeDivide(css),
          image_percent: safeDivide(image),
          font_percent: safeDivide(font),
          html_percent: safeDivide(html),
          json_percent: safeDivide(json),
          svg_percent: safeDivide(svg),
          third_party_percent: safeDivide(thirdParty),
        };
      });
      break;

    case "Transfer Size":
      chartData = pageData.map((x: any) => {
        const js = x.lab_js_transfersize_max || 0;
        const css = x.lab_css_transfersize_max || 0;
        const image = x.lab_image_transfersize_max || 0;
        const font = x.lab_font_transfersize_max || 0;
        const html = x.lab_html_transfersize_max || 0;
        const json = x.lab_json_transfersize_max || 0;
        const svg = x.lab_svg_transfersize_max || 0;
        const thirdParty = x.third_party_transfer_size_max || 0;

        const total = js + css + image + font + html + json + svg + thirdParty;

        const safeDivide = (value: number) =>
          total ? parseFloat(((value / total) * 100).toFixed(2)) : 0;

        return {
          date: x.created_at,
          total_contentSize: total,
          js_contentSize: js,
          css_contentSize: css,
          image_contentSize: image,
          font_contentSize: font,
          html_contentSize: html,
          json_contentSize: json,
          svg_contentSize: svg,
          third_party_contentSize: thirdParty,

          js_percent: safeDivide(js),
          css_percent: safeDivide(css),
          image_percent: safeDivide(image),
          font_percent: safeDivide(font),
          html_percent: safeDivide(html),
          json_percent: safeDivide(json),
          svg_percent: safeDivide(svg),
          third_party_percent: safeDivide(thirdParty),
        };
      });
      break;
  }

  useEffect(() => {
    if (!chartRef.current || !chartData.length) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;
    const dates = chartData.map((item) => item.date);

    const gridLineColor = theme === "dark" ? "#393E46" : "#B3C8CF";

    const seriesKeys = [
      { key: "js_percent", name: "JS" },
      { key: "css_percent", name: "CSS" },
      { key: "image_percent", name: "Images" },
      { key: "font_percent", name: "Fonts" },
      { key: "html_percent", name: "HTML" },
      { key: "json_percent", name: "JSON" },
      { key: "svg_percent", name: "SVG" },
      { key: "third_party_percent", name: "Third Party" }, // Added third-party
    ];

    const series = seriesKeys.map(({ key, name }) => ({
      name,
      type: "line",
      stack: "Total",
      areaStyle: {},
      // smooth: 0.6,
      emphasis: {
        focus: "series",
      },
      lineStyle: {
        width: 0,
      },
      data: chartData.map((item) => item[key] ?? 0),
    }));

    const option = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(50, 50, 50, 0.9)",
        borderWidth: 0,
        padding: 10,
        textStyle: {
          fontSize: 12,
          color: "#fff",
        },
        axisPointer: {
          type: "line",
          lineStyle: {
            color: "#999",
            width: 1,
            type: "dashed",
          },
        },
        formatter: (params: any[]) => {
          if (!params || !params.length) return "";

          const index = params[0].dataIndex;
          const item = chartData[index];
          const date = item.date;

          const nameMap: Record<string, string> = {
            JS: "js",
            CSS: "css",
            Images: "image",
            Fonts: "font",
            HTML: "html",
            JSON: "json",
            SVG: "svg",
            "Third Party": "third_party",
          };

          let tooltipHTML = `<div style="font-weight:bold; margin-bottom: 4px;">${date}</div>`;

          params.forEach((p) => {
            const seriesName = p.seriesName;
            const keyBase = nameMap[seriesName];
            const color = p.color;

            const percent = item[`${keyBase}_percent`] ?? 0;
            const sizeBytes = item[`${keyBase}_contentSize`] ?? 0;
            const sizeKB = (Number(sizeBytes) / 1024).toFixed(1);

            tooltipHTML += `
              <div style="margin-bottom:2px;">
                <span style="color:${color}; margin-right:6px;">●</span>
                ${seriesName}: ${percent}% (${sizeKB} KB)
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
      xAxis: [
        {
          type: "category",
          boundaryGap: false,
          data: dates,
        },
      ],
      yAxis: [
        {
          type: "value",
          name: "Percent (%)",
          max: 100,
          splitLine: {
            show: true,
            lineStyle: { color: gridLineColor, type: "dashed", width: 1 },
          },
        },
      ],
      series,
    };

    chart.setOption(option, { notMerge: true });

    const debouncedResize = debounce(() => chart.resize(), 0);
    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [pageData, assetKey, theme, selectedDevice]);

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
      <div style={{ marginBottom: "8px", color: "#666", fontSize: "14px" }}>
        <p>
          💡 Tip: Monitor and minimize large asset sizes to ensure faster load
          times and better performance.
        </p>
      </div>
    </>
  );
}

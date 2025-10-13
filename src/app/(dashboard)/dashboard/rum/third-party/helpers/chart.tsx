"use client";

import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { PieChart, PieSeriesOption } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Info } from "lucide-react";
import TooltipIcon from "@/components/utils/customTooltip";
import { DomainData } from "./data";
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
]);

type ECOption = echarts.ComposeOption<
  | PieSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | LegendComponentOption
>;

interface ThirdPartyCategoryPieChartProps {
  data: DomainData[];
}

export default function ThirdPartyCategoryPieChart({
  data,
}: ThirdPartyCategoryPieChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<echarts.EChartsType | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { theme } = useTheme();

  const categoryFrequency = data.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.frequency;
    return acc;
  }, {});

  const domainsByCategory = data.reduce<Record<string, DomainData[]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {}
  );

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const isDarkMode = theme === "dark";

    const option: ECOption = {
      textStyle: {
        fontFamily: "Inter, sans-serif",
      },
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
        textStyle: {
          color: isDarkMode ? "#ffffff" : "#000000",
        },
      },
      legend: {
        orient: "vertical",
        left: 0,
        textStyle: {
          color: isDarkMode ? "white" : "#000000",
        },
      },
      series: [
        {
          name: "Category Frequency",
          type: "pie",
          radius: "50%",
          data: Object.entries(categoryFrequency).map(([name, value]) => ({
            name,
            value,
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          label: {
            formatter: "{b}: {c} ({d}%)",
            color: isDarkMode ? "#ffffff" : "#000000",
          },
        },
      ],
    };

    chart.setOption(option);

    const onChartClick = (params: any) => {
      if (params.componentType === "series" && params.seriesType === "pie") {
        setSelectedCategory(params.name);
      }
    };

    chart.on("click", onChartClick);

    return () => {
      chart.off("click", onChartClick);
      chart.dispose();
    };
  }, [theme, categoryFrequency]);

  if (data.length === 0) {
    return (
      <div className="border rounded-sm p-4 bg-gray-200/20 dark:bg-secondary-background text-center text-gray-500 dark:text-gray-400">
        No data available to display the chart.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border rounded-sm p-4 bg-gray-200/20 dark:bg-secondary-background">
      {/* Pie Chart */}
      <div className="relative w-full min-h-[500px] md:h-[550px] max-w-screen">
        <div ref={chartRef} className="w-full h-full" />

        {/* Info Icon */}
        <div className="absolute top-1 right-1">
          <TooltipIcon
            content={
              "The pie chart shows third-party domains by category. Find out the most occurring third party domains, consider delay loading relevant assets and reduce the count to optimize site performance."
            }
            trigger={
              <Info
                size={22}
                className="text-primary/70 hover:text-primary p-[3px] rounded-full hover:bg-primary/10 transition-colors"
              />
            }
          />
        </div>
      </div>

      {/* Details Panel */}
      <div className="md:border-l md:pl-6 space-y-4 overflow-y-auto text-primary ">
        <h2 className="text-[16px] font-semibold mb-4">
          {selectedCategory
            ? `Domains in "${selectedCategory}"`
            : "Select a category"}
        </h2>
        {selectedCategory ? (
          <ul className="divide-y divide-primary/30">
            {domainsByCategory[selectedCategory]?.map(
              ({ domain, frequency }) => (
                <li
                  key={domain}
                  className="flex justify-between py-2 text-sm text-primary/80"
                >
                  <span className="break-words">{domain}</span>
                  <span className="font-mono text-right whitespace-nowrap">
                    <span className="text-xs text-primary/60">Appeared </span>
                    {frequency.toLocaleString()}
                    <span className="text-xs text-primary/60"> times</span>
                  </span>
                </li>
              )
            ) || <li>No domains found</li>}
          </ul>
        ) : (
          <p className="text-gray-500">
            Please click on a pie slice to see details here.
          </p>
        )}
      </div>
    </div>
  );
}

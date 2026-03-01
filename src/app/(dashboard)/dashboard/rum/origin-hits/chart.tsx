"use client";

import { OriginHits } from "@/app/api/dataTypes";
import { useSiteContext } from "../../siteContext";
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { useTheme } from "@/components/theme/ThemeProvider";
import { debounce } from "@/components/utils";

import {
  TooltipComponent,
  GridComponent,
  ToolboxComponent,
  DatasetComponent,
  GraphicComponent,
  MarkLineComponent,
  TransformComponent,
  DataZoomComponent,
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { UniversalTransition } from "echarts/features";

echarts.use([
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  GraphicComponent,
  TransformComponent,
  ToolboxComponent,
  MarkLineComponent,
  LineChart,
  DataZoomComponent,
  CanvasRenderer,
  UniversalTransition,
]);

interface Props {
  data: OriginHits[];
  isLoading: boolean;
}

export default function OriginPerformanceChart({ data, isLoading }: Props) {
  const { selectedSite } = useSiteContext();

  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { theme } = useTheme();

  useEffect(() => {
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: {
            backgroundColor: "#6a7985",
          },
        },
        position: function (pt: any) {
          return [pt[0], "10%"];
        },
        formatter: function (params: any) {
          let tooltipText = `${params[0].axisValue}<br/>`;
          params.forEach((item: any) => {
            if (item.seriesIndex === 0) {
              tooltipText += `<span style="display:inline-block;margin-right:5px;
                               border-radius:50%;width:10px;height:10px;
                               background-color:${item.color};"></span>
                               <b>Origin Hits:</b> ${item.data.toFixed(2)}%<br/>`;
            } else if (item.seriesIndex === 1) {
              tooltipText += `<span style="display:inline-block;margin-right:5px;
                               border-radius:50%;width:10px;height:10px;
                               background-color:#937eb5;"></span>
                               <b>Total Events Captured:</b> ${item.data.toLocaleString()}<br/>`;
            }
          });
          return tooltipText;
        },
      },
      xAxis: {
        type: "category",
        data: data.map((d) =>
          new Date(d.agg_time).toLocaleTimeString([], {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        ),
        axisLabel: {
          rotate: 0,
          fontSize: 10,
          interval: Math.floor(data.length / 5),
        },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        show: true,
        name: "Origin Hit %",
        splitLine: {
          show: false,
        },
        axisTick: { show: true },
        min: 0,
        max: 100,
        splitNumber: 5,
      },
      grid: { top: 40, bottom: 30, left: 40, right: 30, height: 300 },
      series: [
        {
          type: "line",
          showSymbol: false,
          smooth: 0,
          data: data.map((x) => x.origin_hit_percentage),
          lineStyle: {
            width: 0,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "rgb(255, 158, 68)",
              },
              {
                offset: 1,
                color: "rgb(255, 70, 131)",
              },
            ]),
          },
          itemStyle: {
            color: "#ff4d83",
            borderColor: "#ffffff",
            borderWidth: 1,
          },
          encode: { x: 0, y: 1, tooltip: [1] },
          animationDurationUpdate: 300,
          animationEasingUpdate: "cubicOut",
        },
        {
          type: "line",
          showSymbol: false,
          smooth: 0,
          data: data.map((x) => x.total_origin_events),
          lineStyle: {
            width: 0,
          },
          areaStyle: {
            color:
              theme === "dark"
                ? "rgba(78, 166, 244, 0.6)"
                : "rgba(0, 123, 205, 0.6)",
          },
          itemStyle: {
            color: "#ff4d83",
            borderColor: "#ffffff",
            borderWidth: 1,
          },
          encode: { x: 0, y: 1, tooltip: [1] },
          animationDurationUpdate: 300,
          animationEasingUpdate: "cubicOut",
        },
      ],
      toolbox: {
        top: 0,
        right: 30,
        feature: {
          restore: {},
          saveAsImage: {},
        },
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 200,
        },
        {
          start: 0,
          end: 200,
        },
      ],
    };

    chart.setOption(option, { notMerge: true, lazyUpdate: true });

    const debouncedResize = debounce(() => {
      chart.resize();
    }, 10);

    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedSite, data, theme]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-x-hidden">
      <div ref={chartRef} className="w-full h-95" />
    </div>
  );
}

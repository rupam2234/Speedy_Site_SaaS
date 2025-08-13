"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChartPie } from "lucide-react";
import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { PieChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { UniversalTransition } from "echarts/features";
import { useTheme } from "@/components/theme/ThemeProvider";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
  UniversalTransition,
]);

interface URLData {
  url: string;
  count: number;
  avg_ttfb: number;
  max_ttfb: number;
  min_ttfb: number;
  good_count: number;
  poor_count: number;
  needs_improvement_count: number;
}

interface TTFBData {
  device_type: string;
  connection_type: string;
  occurrence_count: number;
  avg_ttfb_value: number;
  min_ttfb_value: number;
  max_ttfb_value: number;
  p75_dns_duration: number;
  p75_connection_duration: number;
  p75_request_duration: number;
  p75_waiting_duration: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  urls: URLData[];
}

interface Props {
  data: TTFBData[];
}

const SORT_OPTIONS = [
  { label: "TTFB", value: "avg_ttfb_value" },
  { label: "Request Time", value: "p75_request_duration" },
  { label: "DNS", value: "p75_dns_duration" },
  { label: "Connection", value: "p75_connection_duration" },
];

const getTTFBSuggestions = (ttfb: number): string[] => {
  const suggestions: string[] = [];

  if (ttfb <= 800) {
    suggestions.push("✅ TTFB is fast (≤800ms). Maintain performance with:");
    suggestions.push(
      "Regularly monitor server response times.",
      "Ensure CDN usage for static assets.",
      "Keep backend logic optimized."
    );
    return suggestions;
  }

  if (ttfb <= 1800) {
    suggestions.push("⚠️ Moderate TTFB (800-1800ms). Consider improving:");
  } else {
    suggestions.push("🚨 High TTFB (>1800ms)! Urgent optimization needed:");
  }

  suggestions.push(
    "Use a CDN to serve assets closer to users.",
    "Cache HTML pages at the edge when possible.",
    "Optimize database queries and backend logic.",
    "Avoid blocking calls on initial request.",
    "Enable HTTP/2 and connection reuse.",
    "Minimize redirects and enable compression (gzip/brotli)."
  );

  return suggestions;
};

const getTTFBColor = (ttfb: number): string => {
  if (ttfb <= 800) return "#66cc8f"; // Green for good
  if (ttfb <= 1800) return "#FFEEA9"; // Orange for needs improvement
  return "#FF9898"; // Red for poor
};

const TTFBBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const { theme } = useTheme();
  const [sortKey, setSortKey] = useState("avg_ttfb_value");
  const [selectedConnection, setSelectedConnection] = useState<string | null>(
    null
  );
  const [urlSortKey, setUrlSortKey] = useState<keyof URLData>("avg_ttfb");
  const [urlSortOrder, setUrlSortOrder] = useState<"asc" | "desc">("desc");
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const normalizeDeviceType = (device: string | undefined) =>
    device?.toLowerCase().trim();

  const filteredData = useMemo(() => {
    const filtered = data
      .filter(
        (item) =>
          normalizeDeviceType(item.device_type) ===
          normalizeDeviceType(selectedDevice)
      )
      .sort((a, b) => {
        const valA = Number(a[sortKey as keyof TTFBData]) || 0;
        const valB = Number(b[sortKey as keyof TTFBData]) || 0;
        return valB - valA;
      });
    return filtered;
  }, [data, selectedDevice, sortKey]);

  const selectedData = filteredData.find(
    (item) => item.connection_type === selectedConnection
  );

  const sortedUrls = useMemo(() => {
    return [...(selectedData?.urls || [])].sort((a, b) => {
      const valA = a[urlSortKey];
      const valB = b[urlSortKey];
      if (urlSortOrder === "asc") {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });
  }, [selectedData, urlSortKey, urlSortOrder]);

  useEffect(() => {
    if (filteredData.length > 0) {
      const validConnection = filteredData.find(
        (item) => item.connection_type === selectedConnection
      );
      if (!validConnection) {
        setSelectedConnection(filteredData[0].connection_type);
      }
    }
  }, [filteredData, selectedConnection]);

  useEffect(() => {
    if (!chartRef.current || !selectedData) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, theme);
    }

    const chart = chartInstanceRef.current;
    const {
      p75_dns_duration,
      p75_connection_duration,
      p75_request_duration,
      p75_waiting_duration,
    } = selectedData;

    const option = {
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c}ms ({d}%)",
        backgroundColor: theme === "dark" ? "#333446" : "#fff",
        textStyle: { color: theme === "dark" ? "#fff" : "#000" },
        borderWidth: 0,
      },
      legend: {
        orient: "horizontal",
        bottom: 0,
        textStyle: { color: theme === "dark" ? "#fff" : "#000" },
      },
      series: [
        {
          name: "TTFB Timing Breakdown",
          type: "pie",
          radius: "50%",
          data: [
            {
              value: Math.round(p75_dns_duration),
              name: "DNS",
              itemStyle: { color: "#4B8BBE" },
            },
            {
              value: Math.round(p75_connection_duration),
              name: "Connection",
              itemStyle: { color: "#FFD166" },
            },
            {
              value: Math.round(p75_request_duration),
              name: "Request",
              itemStyle: { color: "#06D6A0" },
            },
            {
              value: Math.round(p75_waiting_duration),
              name: "Waiting",
              itemStyle: { color: "#EF476F" },
            },
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    };

    chart.setOption(option, { notMerge: false });

    const debouncedResize = () => {
      const timer: ReturnType<typeof setTimeout> = setTimeout(
        () => chart.resize(),
        0
      );
      clearTimeout(timer);
    };

    const resizeObserver = new ResizeObserver(debouncedResize);
    if (chartRef.current) resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedData, theme]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  const handleUrlSort = (key: keyof URLData) => {
    if (urlSortKey === key) {
      setUrlSortOrder(urlSortOrder === "asc" ? "desc" : "asc");
    } else {
      setUrlSortKey(key);
      setUrlSortOrder("desc");
    }
  };

  if (!filteredData.length) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        No data available for {selectedDevice}.
      </div>
    );
  }

  if (!selectedData) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        No connection data available for {selectedDevice}.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: TTFB Breakdown with Bars */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ChartPie size={15} className="fill-green-500/30" />
              <h3 className="text-sm font-medium">TTFB Breakdown</h3>
            </div>
            <select
              className="text-xs bg-gray-500/20 px-2 py-1 rounded border border-muted-foreground/10"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort by {opt.label}
                </option>
              ))}
            </select>
          </div>

          {filteredData.map((item, i) => {
            const {
              connection_type,
              avg_ttfb_value,
              good_count,
              needs_improvement_count,
              poor_count,
              occurrence_count,
            } = item;

            const total = good_count + needs_improvement_count + poor_count;
            const goodPct = (good_count / total) * 100;
            const niPct = (needs_improvement_count / total) * 100;
            const poorPct = (poor_count / total) * 100;

            return (
              <div
                key={i}
                className={`space-y-2 border p-3 rounded-sm bg-muted/5 cursor-pointer ${
                  selectedConnection === connection_type
                    ? "border-green-500"
                    : ""
                }`}
                onClick={() => setSelectedConnection(connection_type)}
              >
                <p className="text-xs font-medium truncate capitalize">
                  {connection_type} ({Math.round(avg_ttfb_value)}ms TTFB)
                </p>

                {selectedConnection === connection_type && (
                  <>
                    <p className="text-xs text-muted-foreground mt-2">
                      {occurrence_count} occurrences
                    </p>
                    <div className="h-2 w-full flex rounded overflow-hidden mt-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="bg-[#66cc8f]"
                            style={{ width: `${goodPct}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>Good: {good_count}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="bg-[#FFEEA9]"
                            style={{ width: `${niPct}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          Needs Improvement: {needs_improvement_count}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="bg-[#FF9898]"
                            style={{ width: `${poorPct}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>Poor: {poor_count}</TooltipContent>
                      </Tooltip>
                    </div>
                    <ul className="pl-4 list-disc text-xs text-muted-foreground space-y-1 mt-2">
                      {getTTFBSuggestions(avg_ttfb_value).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Pie Chart and URL Details Table */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">
            TTFB Timing Breakdown for {selectedConnection} on {selectedDevice}
          </h3>
          <div ref={chartRef} style={{ width: "100%", height: "200px" }} />

          <h3 className="text-sm font-medium">
            URL Performance for {selectedConnection} on {selectedDevice}
          </h3>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs border">
              <thead>
                <tr className="bg-muted/20">
                  <th className="p-2 text-left">
                    <button
                      className="text-left"
                      onClick={() => handleUrlSort("url")}
                    >
                      URL{" "}
                      {urlSortKey === "url" &&
                        (urlSortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="p-2 text-right">
                    <button
                      className="text-right"
                      onClick={() => handleUrlSort("count")}
                    >
                      Count{" "}
                      {urlSortKey === "count" &&
                        (urlSortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="p-2 text-right">
                    <button
                      className="text-right"
                      onClick={() => handleUrlSort("avg_ttfb")}
                    >
                      Avg TTFB (ms){" "}
                      {urlSortKey === "avg_ttfb" &&
                        (urlSortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="p-2 text-right">
                    <button
                      className="text-right"
                      onClick={() => handleUrlSort("good_count")}
                    >
                      Good{" "}
                      {urlSortKey === "good_count" &&
                        (urlSortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="p-2 text-right">
                    <button
                      className="text-right"
                      onClick={() => handleUrlSort("poor_count")}
                    >
                      Poor{" "}
                      {urlSortKey === "poor_count" &&
                        (urlSortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUrls.map((urlData, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 truncate max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{urlData.url}</span>
                        </TooltipTrigger>
                        <TooltipContent>{urlData.url}</TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-2 text-right">{urlData.count}</td>
                    <td
                      className="p-2 text-right"
                      style={{
                        backgroundColor: getTTFBColor(urlData.avg_ttfb),
                      }}
                    >
                      {Math.round(urlData.avg_ttfb)}
                    </td>
                    <td className="p-2 text-right">{urlData.good_count}</td>
                    <td className="p-2 text-right">{urlData.poor_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TTFBBreakdownChart;

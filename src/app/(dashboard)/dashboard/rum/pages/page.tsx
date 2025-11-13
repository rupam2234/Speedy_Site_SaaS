"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import DashboardToolbar from "@/components/utils/toolbar";
import {
  Smile,
  Meh,
  Frown,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  Layout,
  Clock,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Image as ImageIcon,
  Type,
  Monitor,
  GroupIcon,
  InfoIcon,
} from "lucide-react";
import TooltipIcon from "@/components/utils/customTooltip";

type PerformanceGroup = "good" | "average" | "poor";

interface Target {
  count: number;
  target: string;
}

interface PageData {
  device_type: string;
  performance_group: PerformanceGroup;
  domain_name: string;
  current_page: string;
  visit_count: number;
  performance_score: number;
  avg_lcp_ms: number | null;
  avg_fcp_ms: number | null;
  avg_cls: number | null;
  avg_ttfb_ms: number | null;
  avg_inp_ms: number | null;
  sort_order: number;
  cls_targets: Target[];
  inp_targets: Target[];
  lcp_targets: Target[];
}

const performanceTabs: {
  key: PerformanceGroup;
  label: string;
  icon: ReactNode;
}[] = [
  {
    key: "good",
    label: "Good",
    icon: <Smile size={16} className="text-green-500" />,
  },
  {
    key: "average",
    label: "Average",
    icon: <Meh size={16} className="text-yellow-500" />,
  },
  {
    key: "poor",
    label: "Poor",
    icon: <Frown size={16} className="text-red-500" />,
  },
];

type SortKey = "avg_lcp_ms" | "avg_inp_ms" | "avg_cls";
type SortDirection = "asc" | "desc";

export default function RUMpages() {
  const { selectedSite, selectedDevice, rumDateRange } = useSiteContext();
  const [pageData, setPageData] = useState<PageData[]>([]);
  const [activeTab, setActiveTab] = useState<PerformanceGroup>("good");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const itemsPerPage = 10;
  const lastFetched = useRef<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<"LCP" | "INP" | "CLS">(
    "LCP"
  );

  useEffect(() => {
    const cacheKey = `${selectedSite}_${rumDateRange}`;
    if (selectedSite && lastFetched.current !== cacheKey) {
      GetPages(rumDateRange);
      lastFetched.current = cacheKey;
    }
  }, [selectedSite, rumDateRange]);

  async function GetPages(date_range: string) {
    const hours =
      date_range === "last7" ? 168 : date_range === "last24Hours" ? 24 : 168;

    try {
      const res = await fetch("/api/rum/page_performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_domain: selectedSite, hours: hours }),
      });

      if (res.ok) {
        const data: any = await res.json();
        const metrics: PageData[] = (data.metrics || []).filter(
          (x: PageData) => x.device_type !== "unknown"
        );
        setPageData(metrics);
      } else {
        setPageData([]);
      }
    } catch (error) {
      console.error("Fetch failed:", error);
      setPageData([]);
    }
  }

  function getPerformanceGroup(page: PageData): PerformanceGroup {
    const classify = (value: number | null, type: "lcp" | "inp" | "cls") => {
      if (value == null) return "average"; // fallback
      if (type === "lcp") {
        if (value <= 2500) return "good";
        if (value <= 4000) return "average";
        return "poor";
      }
      if (type === "inp") {
        if (value <= 200) return "good";
        if (value <= 500) return "average";
        return "poor";
      }
      if (type === "cls") {
        if (value <= 0.1) return "good";
        if (value <= 0.25) return "average";
        return "poor";
      }
      return "average";
    };

    const scores = [
      classify(page.avg_lcp_ms, "lcp"),
      classify(page.avg_inp_ms, "inp"),
      classify(page.avg_cls, "cls"),
    ];

    // If any metric is poor, overall is poor
    if (scores.includes("poor")) return "poor";

    // If any metric is average, overall is average
    if (scores.includes("average")) return "average";

    // Otherwise, it's good
    return "good";
  }

  const grouped: Record<PerformanceGroup, PageData[]> = {
    good: [],
    average: [],
    poor: [],
  };

  pageData
    .filter(
      (page) =>
        !selectedDevice || page.device_type === selectedDevice.toLowerCase()
    )
    .forEach((page) => {
      const group = getPerformanceGroup(page);
      grouped[group].push(page);
    });

  // Sort logic
  const sortedData = [...grouped[activeTab]].sort((a, b) => {
    if (!sortKey) return 0;
    const aValue = a[sortKey] ?? Infinity;
    const bValue = b[sortKey] ?? Infinity;
    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getMetricColor = (
    metric: number | null,
    type: "lcp" | "inp" | "cls"
  ) => {
    if (metric == null) return "text-gray-400";
    if (type === "lcp") {
      if (metric <= 2500) return "text-green-600";
      if (metric <= 4000) return "text-yellow-500";
      return "text-red-600";
    }
    if (type === "inp") {
      if (metric <= 200) return "text-green-600";
      if (metric <= 500) return "text-yellow-500";
      return "text-red-600";
    }
    if (type === "cls") {
      if (metric <= 0.1) return "text-green-600";
      if (metric <= 0.25) return "text-yellow-500";
      return "text-red-600";
    }
  };

  const getMetricStatus = (
    metric: number | null,
    type: "lcp" | "inp" | "cls"
  ) => {
    if (metric == null)
      return {
        status: "Unknown",
        color: "bg-gray-400",
        icon: <Info className="w-4 h-4" />,
      };

    if (type === "lcp") {
      if (metric <= 2500)
        return {
          status: "Good",
          color: "bg-green-500",
          icon: <CheckCircle className="w-4 h-4" />,
        };
      if (metric <= 4000)
        return {
          status: "Average",
          color: "bg-yellow-500",
          icon: <TrendingUp className="w-4 h-4" />,
        };
      return {
        status: "Poor",
        color: "bg-red-500",
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    }
    if (type === "inp") {
      if (metric <= 200)
        return {
          status: "Good",
          color: "bg-green-500",
          icon: <CheckCircle className="w-4 h-4" />,
        };
      if (metric <= 500)
        return {
          status: "Average",
          color: "bg-yellow-500",
          icon: <TrendingUp className="w-4 h-4" />,
        };
      return {
        status: "Poor",
        color: "bg-red-500",
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    }
    if (type === "cls") {
      if (metric <= 0.1)
        return {
          status: "Good",
          color: "bg-green-500",
          icon: <CheckCircle className="w-4 h-4" />,
        };
      if (metric <= 0.25)
        return {
          status: "Average",
          color: "bg-yellow-500",
          icon: <TrendingUp className="w-4 h-4" />,
        };
      return {
        status: "Poor",
        color: "bg-red-500",
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    }
    return {
      status: "Unknown",
      color: "bg-gray-400",
      icon: <Info className="w-4 h-4" />,
    };
  };

  const getTargetIcon = (target: string) => {
    const lower = target.toLowerCase();
    if (
      lower.includes("img") ||
      lower.includes("jpg") ||
      lower.includes("png") ||
      lower.includes("webp")
    ) {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (
      lower.includes("button") ||
      lower.includes("click") ||
      lower.includes("cta")
    ) {
      return <Target className="w-4 h-4" />;
    }
    if (
      lower.includes("font") ||
      lower.includes("h1") ||
      lower.includes("h2") ||
      lower.includes("title")
    ) {
      return <Type className="w-4 h-4" />;
    }
    if (
      lower.includes("header") ||
      lower.includes("nav") ||
      lower.includes("footer")
    ) {
      return <Layout className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleRow = (index: number) => {
    setExpandedRow((prev) => (prev === index ? null : index));
  };

  return (
    <>
      <DashboardToolbar />

      <div className="px-5 mt-5 flex md:flex-row flex-col gap-2 justify-start items-center md:justify-between text-primary/80">
        <div className="flex items-center gap-2">
          <GroupIcon size={22} className="fill-green-200" />
          <h2 className="text-xl font-semibold">Page Groups</h2>
          <TooltipIcon
            content="Page groups help you identify pages with specific elements causing performance bottlenecks"
            trigger={
              <InfoIcon
                size={22}
                className="text-primary/60 hover:bg-primary/20 rounded-full p-[2px]"
              />
            }
            delay={300}
            side="right"
          />
        </div>
        <div className="flex gap-2 items-center">
          {performanceTabs.map((tab) => {
            return (
              <button
                key={tab.key}
                className={`flex items-center gap-1 border px-4 py-1 hover:dark:bg-secondary-background cursor-pointer hover:bg-primary/10 ${
                  activeTab === tab.label.toLowerCase()
                    ? "bg-primary/10"
                    : "dark:bg-secondary-background"
                }`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-screen p-5">
        <div className="w-auto">
          {/* Table */}
          <div className="bg-white dark:bg-secondary-background rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Visits
                    </th>
                    <th
                      onClick={() => handleSort("avg_lcp_ms")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <div className="flex items-center">
                        LCP{" "}
                        {sortKey === "avg_lcp_ms" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("avg_inp_ms")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <div className="flex items-center">
                        INP{" "}
                        {sortKey === "avg_inp_ms" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("avg_cls")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <div className="flex items-center">
                        CLS{" "}
                        {sortKey === "avg_cls" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-background divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedData.map((page, idx) => {
                    const rowIndex = (currentPage - 1) * itemsPerPage + idx;
                    const isExpanded = expandedRow === rowIndex;
                    return (
                      <React.Fragment key={idx}>
                        <tr
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors duration-150 ${
                            isExpanded ? "bg-gray-50 dark:bg-gray-700/30" : ""
                          }`}
                          onClick={() => toggleRow(rowIndex)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {rowIndex + 1}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                            {page.current_page.replace(/\/$/, "")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {page.visit_count}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center">
                              {page.avg_lcp_ms ? (
                                <>
                                  <span
                                    className={`mr-2 ${getMetricColor(
                                      page.avg_lcp_ms,
                                      "lcp"
                                    )}`}
                                  >
                                    {(page.avg_lcp_ms / 1000).toFixed(2)}s
                                  </span>
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      getMetricStatus(page.avg_lcp_ms, "lcp")
                                        .color
                                    }`}
                                  />
                                </>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center">
                              {page.avg_inp_ms ? (
                                <>
                                  <span
                                    className={`mr-2 ${getMetricColor(
                                      page.avg_inp_ms,
                                      "inp"
                                    )}`}
                                  >
                                    {page.avg_inp_ms.toFixed(0)}ms
                                  </span>
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      getMetricStatus(page.avg_inp_ms, "inp")
                                        .color
                                    }`}
                                  />
                                </>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center">
                              {page.avg_cls ? (
                                <>
                                  <span
                                    className={`mr-2 ${getMetricColor(
                                      page.avg_cls,
                                      "cls"
                                    )}`}
                                  >
                                    {page.avg_cls.toFixed(3)}
                                  </span>
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      getMetricStatus(page.avg_cls, "cls").color
                                    }`}
                                  />
                                </>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                              {isExpanded ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50 dark:bg-gray-700/20">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="bg-white dark:bg-secondary-background rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                {/* Tabs for Metrics */}
                                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                                  {[
                                    {
                                      key: "LCP",
                                      label: "LCP Elements",
                                      icon: <Clock className="w-4 h-4" />,
                                    },
                                    {
                                      key: "INP",
                                      label: "INP Elements",
                                      icon: (
                                        <MousePointerClick className="w-4 h-4" />
                                      ),
                                    },
                                    {
                                      key: "CLS",
                                      label: "CLS Elements",
                                      icon: <Layout className="w-4 h-4" />,
                                    },
                                  ].map((metric) => (
                                    <button
                                      key={metric.key}
                                      onClick={() =>
                                        setActiveMetric(
                                          metric.key as unknown as
                                            | "LCP"
                                            | "INP"
                                            | "CLS"
                                        )
                                      }
                                      className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                        activeMetric === metric.key
                                          ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                      }`}
                                    >
                                      {metric.icon}
                                      <span className="ml-2">
                                        {metric.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>

                                {/* Targets List */}
                                <div className="space-y-3">
                                  {activeMetric === "LCP" &&
                                    (page.lcp_targets.length > 0 ? (
                                      page.lcp_targets.map((target, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center p-3 bg-white dark:bg-secondary-background rounded-lg border border-gray-200 dark:border-gray-600"
                                        >
                                          <div className="flex-shrink-0">
                                            {getTargetIcon(target.target)}
                                          </div>
                                          <div className="ml-3 flex-1 md:max-w-[1024px]">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                              {target.target}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              {target.count} occurrence
                                              {target.count !== 1 ? "s" : ""}
                                            </p>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                        No LCP elements identified
                                      </div>
                                    ))}
                                  {activeMetric === "INP" &&
                                    (page.inp_targets.length > 0 ? (
                                      page.inp_targets.map((target, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center p-3 bg-white dark:bg-secondary-background rounded-lg border border-gray-200 dark:border-gray-600"
                                        >
                                          <div className="flex-shrink-0">
                                            {getTargetIcon(target.target)}
                                          </div>
                                          <div className="ml-3 flex-1 md:max-w-[1024px]">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                              {target.target}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              {target.count} occurrence
                                              {target.count !== 1 ? "s" : ""}
                                            </p>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                        No INP elements identified
                                      </div>
                                    ))}
                                  {activeMetric === "CLS" &&
                                    (page.cls_targets.length > 0 ? (
                                      page.cls_targets.map((target, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center p-3 bg-white dark:bg-secondary-background rounded-lg border border-gray-200 dark:border-gray-600"
                                        >
                                          <div className="flex-shrink-0">
                                            {getTargetIcon(target.target)}
                                          </div>
                                          <div className="ml-3 flex-1 md:max-w-[1024px]">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                              {target.target}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              {target.count} occurrence
                                              {target.count !== 1 ? "s" : ""}
                                            </p>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                        No CLS elements identified
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white dark:bg-secondary-background border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, sortedData.length)}
                </span>{" "}
                of <span className="font-medium">{sortedData.length}</span>{" "}
                results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-secondary-background border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-secondary-background border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

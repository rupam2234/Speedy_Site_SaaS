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
} from "lucide-react";

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

const performanceTabs: { key: PerformanceGroup; label: ReactNode }[] = [
  {
    key: "good",
    label: (
      <span className="flex justify-center items-center gap-2">
        <Smile size={20} className="fill-green-500/30" /> Good
      </span>
    ),
  },
  {
    key: "average",
    label: (
      <span className="flex justify-center items-center gap-2">
        <Meh size={20} className="fill-yellow-500/30" /> Average
      </span>
    ),
  },
  {
    key: "poor",
    label: (
      <span className="flex justify-center items-center gap-2">
        <Frown size={20} className="fill-red-500/30" /> Poor
      </span>
    ),
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
        const data = await res.json();
        const metrics: PageData[] = (data.metrics || []).filter(
          (x: PageData) => x.device_type !== "unknown"
        );
        setPageData(metrics);
        lastFetched.current = selectedSite;
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

  const getColor = (metric: number | null, type: "lcp" | "inp" | "cls") => {
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
      <div className="min-h-screen p-5">
        <div className="w-auto">
          <div className="flex gap-2 mb-4">
            {performanceTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`py-2 px-4 rounded-sm font-medium transition-all duration-300 flex-1 text-center ${
                  activeTab === tab.key
                    ? "bg-primary/50 dark:bg-secondary-background/50 text-white"
                    : "bg-primary/30 dark:bg-secondary-background text-primary/60 "
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="dark:bg-secondary-background bg-gray-200/10 text-primary overflow-x-auto transition-all duration-300">
            <table className="min-w-full table-fixed divide-y divide-gray-50">
              <thead className="dark:bg-secondary-background/30 bg-gray-500/10 border-b-primary">
                <tr>
                  <th className="w-1/12 px-6 py-3 text-left text-xs font-semibold uppercase">
                    S.No
                  </th>
                  <th className="w-4/12 px-6 py-3 text-left text-xs font-semibold uppercase">
                    URL
                  </th>
                  <th className="w-2/12 px-6 py-3 text-left text-xs font-semibold uppercase">
                    Visits
                  </th>
                  <th
                    onClick={() => handleSort("avg_lcp_ms")}
                    className="w-2/12 px-6 py-3 text-left text-xs font-semibold uppercase cursor-pointer"
                  >
                    LCP{" "}
                    {sortKey === "avg_lcp_ms" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    onClick={() => handleSort("avg_inp_ms")}
                    className="w-2/12 px-6 py-3 text-left text-xs font-semibold uppercase cursor-pointer"
                  >
                    INP{" "}
                    {sortKey === "avg_inp_ms" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    onClick={() => handleSort("avg_cls")}
                    className="w-1/12 px-6 py-3 text-left text-xs font-semibold uppercase cursor-pointer"
                  >
                    CLS{" "}
                    {sortKey === "avg_cls" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="w-1/12 px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedData.map((page, idx) => {
                  const rowIndex = (currentPage - 1) * itemsPerPage + idx;
                  const isExpanded = expandedRow === rowIndex;
                  return (
                    <React.Fragment key={idx}>
                      <tr
                        className="dark:hover:bg-secondary-background/30 bg-gray-200/10 hover:bg-gray-300/20 cursor-pointer"
                        onClick={() => toggleRow(rowIndex)}
                      >
                        <td className="px-6 py-4 text-sm text-primary">
                          {rowIndex + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]">
                          {page.current_page}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">
                          {page.visit_count}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-medium ${getColor(
                            page.avg_lcp_ms,
                            "lcp"
                          )}`}
                        >
                          {page.avg_lcp_ms
                            ? `${(page.avg_lcp_ms / 1000).toFixed(2)} s`
                            : "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-medium ${getColor(
                            page.avg_inp_ms,
                            "inp"
                          )}`}
                        >
                          {page.avg_inp_ms
                            ? `${page.avg_inp_ms.toFixed(0)} ms`
                            : "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-medium ${getColor(
                            page.avg_cls,
                            "cls"
                          )}`}
                        >
                          {page.avg_cls?.toFixed(2) ?? "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="dark:bg-secondary-background/10 bg-gray-100/10 transition-all duration-300">
                          <td colSpan={7} className="px-8 py-6">
                            <div className="max-w-4xl mx-auto bg-primary-foreground dark:bg-secondary-background/20 rounded-sm border border-primary/10 dark:border-gray-700 p-6">
                              {/* Tabs for Metrics */}
                              <div className="flex gap-3 mb-6 border-b border-gray-200 dark:border-gray-700">
                                {[
                                  {
                                    key: "LCP",
                                    label: "LCP",
                                    icon: (
                                      <Clock
                                        size={16}
                                        className="inline mr-2"
                                      />
                                    ),
                                  },
                                  {
                                    key: "INP",
                                    label: "INP",
                                    icon: (
                                      <MousePointerClick
                                        size={16}
                                        className="inline mr-2"
                                      />
                                    ),
                                  },
                                  {
                                    key: "CLS",
                                    label: "CLS",
                                    icon: (
                                      <Layout
                                        size={16}
                                        className="inline mr-2"
                                      />
                                    ),
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
                                    className={`flex items-center px-4 py-2 rounded-t-md text-sm font-medium transition-all duration-200 ${
                                      activeMetric === metric.key
                                        ? "bg-primary/10 text-primary border-b-2 border-primary"
                                        : "text-primary/60 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary"
                                    }`}
                                  >
                                    {metric.icon}
                                    {metric.label} Components
                                  </button>
                                ))}
                              </div>

                              {/* Metric Content */}
                              <div className="mt-4 animate-fade-in">
                                <ul className="list-disc pl-6 text-base text-primary/80 space-y-3">
                                  {activeMetric === "LCP" &&
                                    (page.lcp_targets.length > 0 ? (
                                      page.lcp_targets.map((target, i) => (
                                        <li
                                          key={i}
                                          className="transition-opacity duration-200"
                                        >
                                          {target.target}
                                        </li>
                                      ))
                                    ) : (
                                      <li className="text-primary/60">
                                        No LCP key components identified
                                      </li>
                                    ))}
                                  {activeMetric === "INP" &&
                                    (page.inp_targets.length > 0 ? (
                                      page.inp_targets.map((target, i) => (
                                        <li
                                          key={i}
                                          className="transition-opacity duration-200"
                                        >
                                          {target.target}
                                        </li>
                                      ))
                                    ) : (
                                      <li className="text-primary/60">
                                        No INP key components identified
                                      </li>
                                    ))}
                                  {activeMetric === "CLS" &&
                                    (page.cls_targets.length > 0 ? (
                                      page.cls_targets.map((target, i) => (
                                        <li
                                          key={i}
                                          className="transition-opacity duration-200"
                                        >
                                          {target.target}
                                        </li>
                                      ))
                                    ) : (
                                      <li className="text-primary/60">
                                        No CLS key components identified
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {paginatedData.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-primary/70"
                    >
                      No data available for this performance group.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-2 text-sm">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-100 text-primary hover:bg-gray-200 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-primary">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-100 text-primary hover:bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
